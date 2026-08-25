import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock, invokeLLMMock, listLLMModelsMock, storageGetSignedUrlMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), invokeLLMMock: vi.fn(), listLLMModelsMock: vi.fn(), storageGetSignedUrlMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock, listLLMModels: listLLMModelsMock }));
vi.mock("./storage", () => ({ storageGet: vi.fn(), storageGetSignedUrl: storageGetSignedUrlMock, storagePut: vi.fn() }));

import { appRouter } from "./routers";

const organisationId = "7d41438c-b234-4bc1-a0ec-44a846eaff2f";
const branchId = "3b0a3cc9-2706-417a-9681-4ee806513582";
const fileId = "9ce8bf38-d017-4af1-b4ce-95b83ddcf2ab";

function context(): TrpcContext {
  return { user: { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function database(rows: unknown[][]) {
  const inserted: Record<string, unknown>[] = [];
  const query = (result: unknown[]) => Object.assign(Promise.resolve(result), { limit: async () => result });
  const db = {
    select: () => ({ from: () => ({ where: () => query(rows.shift() ?? []) }) }),
    insert: () => ({ values: async (payload: Record<string, unknown>) => { inserted.push(payload); return { affectedRows: 1 }; } }),
    update: () => ({ set: () => ({ where: async () => ({ affectedRows: 1 }) }) }),
    delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
    transaction: async (callback: (transaction: { insert: () => { values: (payload: Record<string, unknown>) => Promise<{ affectedRows: number }> } }) => Promise<unknown>) => callback({ insert: () => ({ values: async (payload: Record<string, unknown>) => { inserted.push(payload); return { affectedRows: 1 }; } }) }),
  };
  return { db, inserted };
}

describe("protected OPay receipt extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer })));
    listLLMModelsMock.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    storageGetSignedUrlMock.mockResolvedValue("https://storage.example/receipt");
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ provider: "OPay", sourceReference: "260819060100009169870983", amountMinor: "3000000", currency: "NGN", occurredAtIso: "2026-08-19T22:34:05", confidence: "high", notes: "Visible fields" }) } }] });
  });

  it("stores only an append-only human-review proposal for an authorised receipt image", async () => {
    const { db, inserted } = database([
      [{ enabled: 1, acceptedAt: new Date() }],
      [{ id: fileId, organisationId, branchId, contentType: "image/webp", sizeBytes: 500, storageKey: "receipt.webp" }],
      [{ id: "member", organisationId, branchId, userId: 1, role: "owner", isActive: 1 }],
      [],
    ]);
    getDbMock.mockResolvedValue(db);

    const result = await appRouter.createCaller(context()).control.evidence.extractOpayReceipt({ organisationId, fileId, idempotencyKey: "receipt-extraction-success-1" });

    expect(result.replayed).toBe(false);
    expect(inserted.some(item => item.provider === "OPay" && item.amountMinor === undefined)).toBe(true);
    expect(invokeLLMMock).toHaveBeenCalledOnce();
  });

  it("rejects non-image files before calling the vision service", async () => {
    const { db } = database([
      [{ enabled: 1, acceptedAt: new Date() }],
      [{ id: fileId, organisationId, branchId, contentType: "application/pdf", sizeBytes: 500, storageKey: "receipt.pdf" }],
      [{ id: "member", organisationId, branchId, userId: 1, role: "owner", isActive: 1 }],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).control.evidence.extractOpayReceipt({ organisationId, fileId, idempotencyKey: "receipt-extraction-pdf-1" })).rejects.toThrow("image receipts only");
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("fails closed before file retrieval or model invocation when the owner has not enabled processing", async () => {
    const { db } = database([[{ enabled: 0, acceptedAt: null }]]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).control.evidence.extractOpayReceipt({ organisationId, fileId, idempotencyKey: "receipt-extraction-disabled-1" })).rejects.toThrow("Receipt extraction is disabled");
    expect(storageGetSignedUrlMock).not.toHaveBeenCalled();
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });
});
