import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock, invokeLLMMock, listLLMModelsMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), invokeLLMMock: vi.fn(), listLLMModelsMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock, listLLMModels: listLLMModelsMock }));

import { appRouter } from "./routers";

const organisationId = "7d41438c-b234-4bc1-a0ec-44a846eaff2f";
const branchId = "3b0a3cc9-2706-417a-9681-4ee806513582";
const otherBranchId = "b6e495a4-6008-412a-8997-e7c775763c3b";
const exceptionId = "8338df03-8947-4623-a1e8-b1d75c14a42f";

function context(): TrpcContext {
  return { user: { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function database(selections: unknown[][]) {
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const query = (rows: unknown[]) => Object.assign(Promise.resolve(rows), { limit: async () => rows, orderBy: () => Promise.resolve(rows) });
  const insert = () => ({ values: async (payload: Record<string, unknown>) => { inserts.push(payload); return { affectedRows: 1 }; } });
  const update = () => ({ set: (payload: Record<string, unknown>) => ({ where: async () => { updates.push(payload); return { affectedRows: 1 }; } }) });
  const db = {
    select: () => ({ from: () => ({ where: () => query(selections.shift() ?? []), innerJoin: () => ({ where: () => query(selections.shift() ?? []) }) }) }),
    insert,
    update,
    delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
    transaction: async (callback: (transaction: { insert: typeof insert; update: typeof update }) => Promise<unknown>) => callback({ insert, update }),
  };
  return { db, inserts, updates };
}

const openException = { id: exceptionId, organisationId, branchId, status: "open", type: "unmatched_record", severity: "high", valueImpactMinor: "2999778", currency: "NGN", dueAt: null, obligationId: null, evidenceEventId: null };
const ownerMembership = { id: "member", organisationId, userId: 1, branchId: null, role: "owner", isActive: 1 };

describe("protected AI variance assistance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listLLMModelsMock.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ confidence: "medium", summary: "Review the amount difference.", potentialCauses: [{ label: "Unmatched payment", rationale: "The evidence and expected value differ.", confidence: "medium" }], possibleMatches: [{ candidateKey: "R1", rationale: "This candidate has the closest value.", confidence: "low" }], reviewSteps: ["Compare the original source references."] }) } }] });
  });

  it("fails closed before model invocation when the owner policy is disabled", async () => {
    const { db } = database([[openException], [ownerMembership], [{ id: branchId }], [{ enabled: 0, acceptedAt: null }]]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).varianceAi.suggestions.analyse({ organisationId, exceptionId, idempotencyKey: "variance-disabled-01" })).rejects.toThrow("AI variance assistance is disabled");
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthorised role before model invocation", async () => {
    const { db } = database([[openException], [{ ...ownerMembership, role: "operator" }]]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).varianceAi.suggestions.analyse({ organisationId, exceptionId, idempotencyKey: "variance-role-denied-01" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("keeps a wrong-branch candidate out of the model input and persists only proposal and audit records", async () => {
    const { db, inserts, updates } = database([
      [openException], [ownerMembership], [{ id: branchId }], [{ enabled: 1, acceptedAt: new Date() }], [],
      [{ id: "right", branchId, reference: "INV-RIGHT", amountMinor: "3000000", currency: "NGN", status: "open", dueAt: null }, { id: "wrong", branchId: otherBranchId, reference: "INV-WRONG", amountMinor: "2999778", currency: "NGN", status: "open", dueAt: null }],
      [{ id: "evidence-right", branchId, sourceReference: "OP-001", kind: "payment_observation", amountMinor: "3000000", currency: "NGN", status: "recorded", sourceName: "Sensitive source label", occurredAt: null }],
    ]);
    getDbMock.mockResolvedValue(db);

    const result = await appRouter.createCaller(context()).varianceAi.suggestions.analyse({ organisationId, exceptionId, idempotencyKey: "variance-success-01" });

    expect(result.replayed).toBe(false);
    const modelInput = String(invokeLLMMock.mock.calls[0]?.[0]?.messages?.[1]?.content);
    expect(modelInput).toContain("INV-RIGHT");
    expect(modelInput).toContain("OP-001");
    expect(modelInput).not.toContain("INV-WRONG");
    expect(modelInput).not.toContain("Sensitive source label");
    expect(inserts.some(record => record.model === "gpt-5-mini" && record.exceptionId === exceptionId && record.proposal !== undefined)).toBe(true);
    expect(inserts.some(record => record.action === "variance_ai.suggestion_proposed")).toBe(true);
    expect(updates).toEqual([expect.objectContaining({ responseMetadata: expect.any(Object) })]);
    expect(inserts.some(record => "resolutionNote" in record || "resolvedAt" in record || "allocatedMinor" in record || "status" in record)).toBe(false);
  });

  it("allows only an owner to enable the processing policy and writes the policy change with its audit event inside the controlled workflow", async () => {
    const rejected = database([[{ ...ownerMembership, role: "controller" }]]);
    getDbMock.mockResolvedValue(rejected.db);
    await expect(appRouter.createCaller(context()).varianceAi.policy.configure({ organisationId, branchId, enabled: true, acceptProcessingNotice: true, confirmation: "ENABLE VARIANCE AI", idempotencyKey: "variance-policy-denied-01" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const { db, inserts, updates } = database([[ownerMembership], [{ id: branchId }], [{ enabled: 0 }], []]);
    getDbMock.mockResolvedValue(db);
    await expect(appRouter.createCaller(context()).varianceAi.policy.configure({ organisationId, branchId, enabled: true, acceptProcessingNotice: true, confirmation: "ENABLE VARIANCE AI", idempotencyKey: "variance-policy-owner-01" })).resolves.toMatchObject({ replayed: false });
    expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ varianceAiAssistanceEnabled: 1 }), expect.objectContaining({ responseMetadata: expect.any(Object) })]));
    expect(inserts).toContainEqual(expect.objectContaining({ action: "variance_ai.policy_enabled", metadata: expect.objectContaining({ activationConfirmation: "owner_typed", noticeVersion: "2026-08-26" }) }));
  });

  it("requires the typed confirmation before an owner can enable the policy", async () => {
    const { db, updates } = database([[ownerMembership], [{ id: branchId }]]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).varianceAi.policy.configure({ organisationId, branchId, enabled: true, acceptProcessingNotice: true, confirmation: "ENABLE AI", idempotencyKey: "variance-policy-confirmation-01" })).rejects.toThrow("Type the displayed confirmation exactly");
    expect(updates).toEqual([]);
  });

  it("enforces the per-case 24-hour analysis budget before model invocation", async () => {
    const { db } = database([
      [openException], [ownerMembership], [{ id: branchId }], [{ enabled: 1, acceptedAt: new Date() }], [], [], [],
      [{ id: "recent-1" }, { id: "recent-2" }, { id: "recent-3" }],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).varianceAi.suggestions.analyse({ organisationId, exceptionId, idempotencyKey: "variance-budget-01" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("returns only unique unresolved same-branch variances with saved suggestions for review without invoking the model", async () => {
    const { db } = database([
      [ownerMembership], [{ id: branchId }],
      [
        { exceptionId: "open-case", createdAt: new Date("2026-08-27T00:00:00.000Z"), confidence: "high", status: "open" },
        { exceptionId: "open-case", createdAt: new Date("2026-08-26T00:00:00.000Z"), confidence: "low", status: "open" },
        { exceptionId: "closed-case", createdAt: new Date("2026-08-27T00:00:00.000Z"), confidence: "medium", status: "resolved" },
      ],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).varianceAi.suggestions.reviewQueue({ organisationId, branchId })).resolves.toEqual([
      { exceptionId: "open-case", createdAt: new Date("2026-08-27T00:00:00.000Z"), confidence: "high" },
    ]);
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });
});
