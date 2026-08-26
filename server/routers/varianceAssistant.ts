import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import {
  auditEvents,
  branches,
  controlExceptions,
  evidenceEvents,
  idempotencyKeys,
  organisations,
  receivableObligations,
  users,
  varianceAiSuggestions,
} from "../../drizzle/schema";
import { hasConfirmedVarianceAiEnablement, orderVarianceCandidates, parseVarianceAiProposalResponse, type VarianceCandidate, varianceAiDailyAnalysisLimit, varianceAiProcessingNoticeVersion } from "../control/varianceAssistant";
import { permissions, requireScopedMembership } from "../control/access";
import { getDb } from "../db";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

const scopeInput = z.object({ organisationId: z.string().uuid(), branchId: z.string().uuid() });
const recordId = () => crypto.randomUUID();
const correlation = () => crypto.randomUUID();
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

async function requireActiveScope(input: { organisationId: string; branchId: string; userId: number; allowed: readonly any[] }) {
  await requireScopedMembership(input);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.organisationId, input.organisationId), eq(branches.isActive, 1))).limit(1);
  if (!branch) throw new TRPCError({ code: "NOT_FOUND", message: "Branch not found in the selected organisation." });
  return db;
}

async function getOrCreateIdempotent(input: {
  organisationId: string;
  userId: number;
  action: string;
  idempotencyKey: string;
  request: unknown;
  execute: () => Promise<{ entityId: string; correlationId: string }>;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const requestHash = sha256(JSON.stringify(input.request));
  const [existing] = await db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.organisationId, input.organisationId), eq(idempotencyKeys.actorUserId, input.userId), eq(idempotencyKeys.action, input.action), eq(idempotencyKeys.idempotencyKey, input.idempotencyKey))).limit(1);
  if (existing) {
    if (existing.requestHash !== requestHash) throw new TRPCError({ code: "CONFLICT", message: "This idempotency key was previously used for a different request." });
    const cached = existing.responseMetadata as { entityId: string; correlationId: string } | null;
    if (!cached) throw new TRPCError({ code: "CONFLICT", message: "This request is still being processed. Try again shortly." });
    return { ...cached, replayed: true };
  }
  const id = recordId();
  try {
    await db.insert(idempotencyKeys).values({ id, organisationId: input.organisationId, actorUserId: input.userId, action: input.action, idempotencyKey: input.idempotencyKey, requestHash });
  } catch {
    throw new TRPCError({ code: "CONFLICT", message: "This action is already being processed." });
  }
  try {
    const result = await input.execute();
    await db.update(idempotencyKeys).set({ responseMetadata: result }).where(eq(idempotencyKeys.id, id));
    return { ...result, replayed: false };
  } catch (error) {
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.id, id));
    throw error;
  }
}

function compactCandidate(candidate: VarianceCandidate) {
  return {
    candidateKey: candidate.candidateKey,
    kind: candidate.kind,
    reference: candidate.reference,
    status: candidate.status,
    amountMinor: candidate.amountMinor,
    currency: candidate.currency,
    occurredAt: candidate.occurredAt,
  };
}

const aiOutputSchema = {
  name: "variance_investigation_proposal",
  strict: true,
  schema: {
    type: "object",
    properties: {
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      summary: { type: "string" },
      potentialCauses: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, rationale: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] } },
          required: ["label", "rationale", "confidence"],
          additionalProperties: false,
        },
      },
      possibleMatches: {
        type: "array",
        items: {
          type: "object",
          properties: { candidateKey: { type: "string" }, rationale: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] } },
          required: ["candidateKey", "rationale", "confidence"],
          additionalProperties: false,
        },
      },
      reviewSteps: { type: "array", items: { type: "string" } },
    },
    required: ["confidence", "summary", "potentialCauses", "possibleMatches", "reviewSteps"],
    additionalProperties: false,
  },
} as const;

export const varianceAssistantRouter = router({
  policy: router({
    get: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await requireActiveScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [policy] = await db.select({ enabled: organisations.varianceAiAssistanceEnabled, acceptedAt: organisations.varianceAiAssistancePolicyAcceptedAt, acceptedBy: users.name }).from(organisations).leftJoin(users, eq(users.id, organisations.varianceAiAssistancePolicyAcceptedByUserId)).where(eq(organisations.id, input.organisationId)).limit(1);
      if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found." });
      return { enabled: policy.enabled === 1, acceptedAt: policy.acceptedAt, acceptedBy: policy.acceptedBy, noticeVersion: varianceAiProcessingNoticeVersion, dailyAnalysisLimit: varianceAiDailyAnalysisLimit };
    }),
    configure: protectedProcedure.input(scopeInput.extend({ enabled: z.boolean(), acceptProcessingNotice: z.boolean(), confirmation: z.string().trim().max(80), idempotencyKey: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const db = await requireActiveScope({ ...input, userId: ctx.user.id, allowed: permissions.manageVarianceAiAssistance });
      if (input.enabled && !input.acceptProcessingNotice) throw new TRPCError({ code: "BAD_REQUEST", message: "An owner must acknowledge the variance-AI processing notice before enabling assistance." });
      if (input.enabled && !hasConfirmedVarianceAiEnablement(input.confirmation)) throw new TRPCError({ code: "BAD_REQUEST", message: "Type the displayed confirmation exactly before enabling AI assistance." });
      const [currentPolicy] = await db.select({ enabled: organisations.varianceAiAssistanceEnabled }).from(organisations).where(eq(organisations.id, input.organisationId)).limit(1);
      if (!currentPolicy) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found." });
      if (input.enabled && currentPolicy.enabled === 1) throw new TRPCError({ code: "CONFLICT", message: "AI variance assistance is already enabled. Disable it first before changing this policy." });
      return getOrCreateIdempotent({
        organisationId: input.organisationId,
        userId: ctx.user.id,
        action: "variance_ai.configure_policy",
        idempotencyKey: input.idempotencyKey,
        request: { branchId: input.branchId, enabled: input.enabled, acceptProcessingNotice: input.acceptProcessingNotice, noticeVersion: input.enabled ? varianceAiProcessingNoticeVersion : null },
        execute: async () => {
          const correlationId = correlation();
          await db.transaction(async transaction => {
            await transaction.update(organisations).set(input.enabled
              ? { varianceAiAssistanceEnabled: 1, varianceAiAssistancePolicyAcceptedAt: new Date(), varianceAiAssistancePolicyAcceptedByUserId: ctx.user.id }
              : { varianceAiAssistanceEnabled: 0, varianceAiAssistancePolicyAcceptedAt: null, varianceAiAssistancePolicyAcceptedByUserId: null },
            ).where(eq(organisations.id, input.organisationId));
            await transaction.insert(auditEvents).values({
              id: recordId(), organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id,
              action: input.enabled ? "variance_ai.policy_enabled" : "variance_ai.policy_disabled", entityType: "organisation", entityId: input.organisationId, correlationId,
              metadata: { purpose: "variance_assistance", acceptedProcessingNotice: input.enabled, noticeVersion: input.enabled ? varianceAiProcessingNoticeVersion : null, activationConfirmation: input.enabled ? "owner_typed" : null },
            });
          });
          return { entityId: input.organisationId, correlationId };
        },
      });
    }),
  }),
  suggestions: router({
    list: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), exceptionId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const [exception] = await db.select({ branchId: controlExceptions.branchId }).from(controlExceptions).where(and(eq(controlExceptions.id, input.exceptionId), eq(controlExceptions.organisationId, input.organisationId))).limit(1);
      if (!exception) throw new TRPCError({ code: "NOT_FOUND", message: "Exception not found." });
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, branchId: exception.branchId, allowed: permissions.read });
      return db.select({ id: varianceAiSuggestions.id, model: varianceAiSuggestions.model, confidence: varianceAiSuggestions.confidence, proposal: varianceAiSuggestions.proposal, createdAt: varianceAiSuggestions.createdAt, correlationId: varianceAiSuggestions.correlationId }).from(varianceAiSuggestions).where(and(eq(varianceAiSuggestions.organisationId, input.organisationId), eq(varianceAiSuggestions.exceptionId, input.exceptionId))).orderBy(desc(varianceAiSuggestions.createdAt));
    }),
    analyse: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), exceptionId: z.string().uuid(), idempotencyKey: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const [exception] = await db.select().from(controlExceptions).where(and(eq(controlExceptions.id, input.exceptionId), eq(controlExceptions.organisationId, input.organisationId))).limit(1);
      if (!exception) throw new TRPCError({ code: "NOT_FOUND", message: "Exception not found." });
      if (!["open", "investigating"].includes(exception.status)) throw new TRPCError({ code: "CONFLICT", message: "AI assistance is available only for open or investigating variances." });
      await requireActiveScope({ organisationId: input.organisationId, branchId: exception.branchId, userId: ctx.user.id, allowed: permissions.requestVarianceAiAssistance });
      const [policy] = await db.select({ enabled: organisations.varianceAiAssistanceEnabled, acceptedAt: organisations.varianceAiAssistancePolicyAcceptedAt }).from(organisations).where(eq(organisations.id, input.organisationId)).limit(1);
      if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found." });
      if (policy.enabled !== 1 || !policy.acceptedAt) throw new TRPCError({ code: "FORBIDDEN", message: "AI variance assistance is disabled until an organisation owner accepts the processing notice and enables it." });
      return getOrCreateIdempotent({
        organisationId: input.organisationId,
        userId: ctx.user.id,
        action: "variance_ai.analyse",
        idempotencyKey: input.idempotencyKey,
        request: { exceptionId: input.exceptionId },
        execute: async () => {
          const [linkedObligation] = exception.obligationId ? await db.select({ amountMinor: receivableObligations.amountMinor, currency: receivableObligations.currency, status: receivableObligations.status, dueAt: receivableObligations.dueAt }).from(receivableObligations).where(and(eq(receivableObligations.id, exception.obligationId), eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, exception.branchId))).limit(1) : [];
          const [linkedEvidence] = exception.evidenceEventId ? await db.select({ kind: evidenceEvents.kind, amountMinor: evidenceEvents.amountMinor, currency: evidenceEvents.currency, status: evidenceEvents.status, occurredAt: evidenceEvents.occurredAt }).from(evidenceEvents).where(and(eq(evidenceEvents.id, exception.evidenceEventId), eq(evidenceEvents.organisationId, input.organisationId), eq(evidenceEvents.branchId, exception.branchId))).limit(1) : [];
          const obligations = exception.currency ? await db.select({ id: receivableObligations.id, branchId: receivableObligations.branchId, reference: receivableObligations.reference, amountMinor: receivableObligations.amountMinor, currency: receivableObligations.currency, status: receivableObligations.status, dueAt: receivableObligations.dueAt }).from(receivableObligations).where(and(eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, exception.branchId), eq(receivableObligations.currency, exception.currency))).limit(9) : [];
          const evidence = exception.currency ? await db.select({ id: evidenceEvents.id, branchId: evidenceEvents.branchId, sourceReference: evidenceEvents.sourceReference, kind: evidenceEvents.kind, amountMinor: evidenceEvents.amountMinor, currency: evidenceEvents.currency, status: evidenceEvents.status, occurredAt: evidenceEvents.occurredAt }).from(evidenceEvents).where(and(eq(evidenceEvents.organisationId, input.organisationId), eq(evidenceEvents.branchId, exception.branchId), eq(evidenceEvents.currency, exception.currency))).limit(9) : [];
          const candidateRows: VarianceCandidate[] = [
            ...obligations.filter(row => row.id !== exception.obligationId && row.branchId === exception.branchId).filter(row => row.amountMinor !== null).map((row, index) => ({ candidateKey: `R${index + 1}`, kind: "receivable" as const, reference: row.reference, status: row.status, amountMinor: String(row.amountMinor), currency: row.currency, occurredAt: row.dueAt?.toISOString() ?? null })),
            ...evidence.filter(row => row.id !== exception.evidenceEventId && row.branchId === exception.branchId).filter(row => row.amountMinor !== null && row.currency).map((row, index) => ({ candidateKey: `E${index + 1}`, kind: "evidence" as const, reference: row.sourceReference ?? row.id, status: row.status, amountMinor: String(row.amountMinor), currency: row.currency!, occurredAt: row.occurredAt?.toISOString() ?? null })),
          ];
          const candidates = orderVarianceCandidates(candidateRows, String(exception.valueImpactMinor ?? "0")).slice(0, 12);
          const minimisedInput = {
            case: { type: exception.type, severity: exception.severity, status: exception.status, valueImpactMinor: String(exception.valueImpactMinor ?? "0"), currency: exception.currency, dueAt: exception.dueAt?.toISOString() ?? null },
            linkedRecords: {
              receivable: linkedObligation ? { amountMinor: String(linkedObligation.amountMinor), currency: linkedObligation.currency, status: linkedObligation.status, dueAt: linkedObligation.dueAt?.toISOString() ?? null } : null,
              evidence: linkedEvidence ? { kind: linkedEvidence.kind, amountMinor: linkedEvidence.amountMinor === null ? null : String(linkedEvidence.amountMinor), currency: linkedEvidence.currency, status: linkedEvidence.status, occurredAt: linkedEvidence.occurredAt?.toISOString() ?? null } : null,
            },
            candidates: candidates.map(compactCandidate),
          };
          const recentAnalyses = await db.select({ id: varianceAiSuggestions.id }).from(varianceAiSuggestions).where(and(eq(varianceAiSuggestions.organisationId, input.organisationId), eq(varianceAiSuggestions.exceptionId, exception.id), gte(varianceAiSuggestions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))).limit(varianceAiDailyAnalysisLimit);
          if (recentAnalyses.length >= varianceAiDailyAnalysisLimit) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `This case has reached its ${varianceAiDailyAnalysisLimit}-analysis review limit for the last 24 hours. Continue the normal evidence review.` });
          const models = await listLLMModels();
          const model = ["gpt-5-mini", "claude-haiku-4-5", "gemini-3-flash-preview"].find(id => models.data.some(item => item.id === id)) ?? models.data[0]?.id;
          if (!model) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No controlled analysis model is currently available." });
          let proposal;
          try {
            const response = await invokeLLM({
              model,
              maxTokens: 1000,
              messages: [
                { role: "system", content: "You assist an accountant investigating a discrepancy. You are not an authority and must not claim payment, settlement, reconciliation, approval, posting, or resolution. Use only the structured records supplied. Do not invent names, references, transactions, dates, or facts. Return concise investigation hypotheses and review steps only. Candidate keys are opaque; mention a candidate only when its supplied attributes plausibly relate to the case." },
                { role: "user", content: `Analyse this minimised, same-branch variance record. Suggest at most three potential causes, at most four possible candidate keys, and at most three human review steps. State low confidence where the supplied data is insufficient. Do not direct any record mutation.\n${JSON.stringify(minimisedInput)}` },
              ],
              outputSchema: aiOutputSchema,
            });
            proposal = parseVarianceAiProposalResponse(response.choices?.[0]?.message.content, candidates.map(candidate => candidate.candidateKey));
          } catch {
            throw new TRPCError({ code: "BAD_GATEWAY", message: "AI assistance could not produce a valid proposal. Review the variance through the normal controlled workflow." });
          }
          const entityId = recordId(); const correlationId = correlation(); const inputHash = sha256(JSON.stringify(minimisedInput));
          const storedProposal = { ...proposal, candidateSnapshot: candidates.map(compactCandidate), boundary: "AI suggestion only — review evidence; no action has been taken." };
          await db.transaction(async transaction => {
            await transaction.insert(varianceAiSuggestions).values({ id: entityId, organisationId: input.organisationId, branchId: exception.branchId, exceptionId: exception.id, model, confidence: proposal.confidence, inputHash, proposal: storedProposal, correlationId, createdByUserId: ctx.user.id });
            await transaction.insert(auditEvents).values({ id: recordId(), organisationId: input.organisationId, branchId: exception.branchId, actorUserId: ctx.user.id, action: "variance_ai.suggestion_proposed", entityType: "variance_ai_suggestion", entityId, correlationId, metadata: { exceptionId: exception.id, model, confidence: proposal.confidence, candidateCount: candidates.length } });
          });
          return { entityId, correlationId };
        },
      });
    }),
  }),
});
