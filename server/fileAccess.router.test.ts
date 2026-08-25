import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock, storageGetSignedUrlMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), storageGetSignedUrlMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./storage", () => ({ storageGetSignedUrl: storageGetSignedUrlMock, storagePut: vi.fn() }));

import { appRouter } from "./routers";

describe("controlled evidence-file delivery", () => {
  it("returns an authorised provider-signed URL without exposing the raw storage key or storage URL", async () => {
    const organisationId = "7d41438c-b234-4bc1-a0ec-44a846eaff2f";
    const branchId = "3b0a3cc9-2706-417a-9681-4ee806513582";
    const fileId = "9ce8bf38-d017-4af1-b4ce-95b83ddcf2ab";
    let selections = 0;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => {
        selections += 1;
        return selections === 1
          ? [{ id: fileId, organisationId, branchId, storageKey: "hidden/receipt.webp", storageUrl: "/manus-storage/hidden/receipt.webp", originalName: "receipt.webp", contentType: "image/webp", sizeBytes: 53000 }]
          : [{ id: "member", organisationId, branchId, userId: 1, role: "owner", isActive: 1 }];
      } }) }) }),
    };
    getDbMock.mockResolvedValue(db);
    storageGetSignedUrlMock.mockResolvedValue("https://storage.example/signed-receipt?expires=short");
    const ctx: TrpcContext = { user: { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };

    const result = await appRouter.createCaller(ctx).control.evidence.getFile({ organisationId, fileId });

    expect(result).toMatchObject({ id: fileId, originalName: "receipt.webp", contentType: "image/webp", sizeBytes: 53000 });
    expect(result.url).toBe("https://storage.example/signed-receipt?expires=short");
    expect(result).not.toHaveProperty("storageKey");
    expect(result).not.toHaveProperty("storageUrl");
    expect(storageGetSignedUrlMock).toHaveBeenCalledWith("hidden/receipt.webp");
  });
});
