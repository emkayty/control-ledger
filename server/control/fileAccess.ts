import { createHash, randomBytes } from "node:crypto";

export const FILE_ACCESS_GRANT_TTL_MS = 2 * 60 * 1000;

export function hashFileAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createFileAccessGrant(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashFileAccessToken(token),
    expiresAt: new Date(now.getTime() + FILE_ACCESS_GRANT_TTL_MS),
  };
}
