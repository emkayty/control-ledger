import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock, storagePutMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), storagePutMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./storage", () => ({ storagePut: storagePutMock, storageGetSignedUrl: vi.fn() }));

import { appRouter } from "./routers";

const organisationId = "7d41438c-b234-4bc1-a0ec-44a846eaff2f";
const branchId = "3b0a3cc9-2706-417a-9681-4ee806513582";
const exceptionId = "8338df03-8947-4623-a1e8-b1d75c14a42f";
const noteId = "c9a4c3a9-0256-4f03-81bd-444444444444";

function context(): TrpcContext {
  return { user: { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function database(selections: unknown[][]) {
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const query = (rows: unknown[]) => Object.assign(Promise.resolve(rows), { limit: async () => rows });
  const insert = () => ({ values: async (payload: Record<string, unknown>) => { inserts.push(payload); return { affectedRows: 1 }; } });
  const update = () => ({ set: (payload: Record<string, unknown>) => ({ where: async () => { updates.push(payload); return { affectedRows: 1 }; } }) });
  return {
    db: {
      select: () => ({ from: () => ({ where: () => query(selections.shift() ?? []) }) }),
      insert,
      update,
      delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
      transaction: async (callback: (transaction: { insert: typeof insert; update: typeof update }) => Promise<unknown>) => callback({ insert, update }),
    },
    inserts,
    updates,
  };
}

describe("investigation-note attachment controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storagePutMock.mockResolvedValue({ key: "private/note/screenshot.png", url: "/manus-storage/private/note/screenshot.png" });
  });

  it("stores an allowed attachment in managed storage and appends both metadata and an audit event", async () => {
    const { db, inserts, updates } = database([
      [{ id: exceptionId, organisationId, branchId }], [{ id: noteId }],
      [{ id: "membership", organisationId, userId: 1, branchId: null, role: "owner", isActive: 1 }], [], [],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).control.exceptions.addNoteAttachment({
      organisationId, exceptionId, noteId,
      attachment: { filename: "receipt screenshot.png", contentType: "image/png", contentBase64: "data:image/png;base64,YQ==" },
      idempotencyKey: "note-attachment-success-01",
    })).resolves.toMatchObject({ replayed: false });

    expect(storagePutMock).toHaveBeenCalledWith(expect.stringContaining(`${organisationId}/${branchId}/investigation-notes/${noteId}/`), expect.any(Buffer), "image/png");
    expect(inserts).toContainEqual(expect.objectContaining({ exceptionId, exceptionNoteId: noteId, storageKey: "private/note/screenshot.png", contentType: "image/png" }));
    expect(inserts).toContainEqual(expect.objectContaining({ action: "exception.note_attachment_uploaded", entityType: "exception_note_attachment" }));
    expect(updates).toEqual([expect.objectContaining({ responseMetadata: expect.any(Object) })]);
  });

  it("rejects a user who cannot add notes before managed storage is called", async () => {
    const { db } = database([
      [{ id: exceptionId, organisationId, branchId }], [{ id: noteId }],
      [{ id: "membership", organisationId, userId: 1, branchId: null, role: "approver", isActive: 1 }],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).control.exceptions.addNoteAttachment({
      organisationId, exceptionId, noteId,
      attachment: { filename: "blocked.png", contentType: "image/png", contentBase64: "data:image/png;base64,YQ==" },
      idempotencyKey: "note-attachment-denied-01",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePutMock).not.toHaveBeenCalled();
  });
});
