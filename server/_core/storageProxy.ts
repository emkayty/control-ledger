import type { Express } from "express";
import { and, eq, gt } from "drizzle-orm";
import { evidenceFileAccessGrants, evidenceFiles } from "../../drizzle/schema";
import { requireScopedMembership, permissions } from "../control/access";
import { getDb } from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { hashFileAccessToken } from "../control/fileAccess";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/grant/:token", async (req, res) => {
    const user = await sdk.authenticateRequest(req).catch(() => null);
    if (!user) {
      res.status(401).send("Authentication is required for controlled file access.");
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(503).send("Storage access is temporarily unavailable.");
      return;
    }

    const [grant] = await db.select().from(evidenceFileAccessGrants).where(and(
      eq(evidenceFileAccessGrants.tokenHash, hashFileAccessToken(req.params.token)),
      eq(evidenceFileAccessGrants.userId, user.id),
      gt(evidenceFileAccessGrants.expiresAt, new Date()),
    )).limit(1);
    if (!grant) {
      res.status(403).send("This controlled file-access grant is invalid or expired.");
      return;
    }

    try {
      await requireScopedMembership({ userId: user.id, organisationId: grant.organisationId, branchId: grant.branchId, allowed: permissions.read });
    } catch {
      res.status(403).send("You no longer have access to this controlled file.");
      return;
    }

    const [file] = await db.select({ storageKey: evidenceFiles.storageKey }).from(evidenceFiles).where(and(
      eq(evidenceFiles.id, grant.evidenceFileId),
      eq(evidenceFiles.organisationId, grant.organisationId),
      eq(evidenceFiles.branchId, grant.branchId),
    )).limit(1);
    if (!file) {
      res.status(404).send("Controlled file not found.");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", file.storageKey);
      const forgeResp = await fetch(forgeUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });

  app.get("/manus-storage/*", async (req, res) => {
    res.status(404).send("Use an authorised controlled-file access grant.");
  });
}
