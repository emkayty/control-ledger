import { and, eq, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { organisationMemberships } from "../../drizzle/schema";
import { getDb } from "../db";

export type ControlRole = "owner" | "controller" | "operator" | "manager" | "approver";

export const permissions = {
  read: ["owner", "controller", "operator", "manager", "approver"],
  createCustomer: ["owner", "controller", "operator", "manager"],
  createObligation: ["owner", "controller", "operator", "manager"],
  recordEvidence: ["owner", "controller", "operator", "manager"],
  reconcile: ["owner", "controller", "manager"],
  resolve: ["owner", "controller", "manager"],
  approve: ["owner", "controller", "approver"],
} as const;

export function canPerform(role: ControlRole, action: keyof typeof permissions) {
  return (permissions[action] as readonly ControlRole[]).includes(role);
}

export async function requireScopedMembership(input: {
  userId: number;
  organisationId: string;
  branchId?: string;
  allowed: readonly ControlRole[];
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

  const scopeCondition = input.branchId
    ? or(eq(organisationMemberships.branchId, input.branchId), isNull(organisationMemberships.branchId))
    : undefined;

  const rows = await db
    .select()
    .from(organisationMemberships)
    .where(
      and(
        eq(organisationMemberships.organisationId, input.organisationId),
        eq(organisationMemberships.userId, input.userId),
        eq(organisationMemberships.isActive, 1),
        scopeCondition,
      ),
    )
    .limit(5);

  const membership = rows.find(row => input.allowed.includes(row.role));
  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this organisation or branch action." });
  }
  return membership;
}
