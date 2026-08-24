import { TRPCError } from "@trpc/server";

const MONEY_PATTERN = /^-?(0|[1-9]\d{0,19})$/;

/** Exact minor-unit money values are represented as decimal strings, never JavaScript floats. */
export function isMinorAmount(value: string) {
  return MONEY_PATTERN.test(value);
}

export function assertMinorAmount(value: string) {
  if (!isMinorAmount(value)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Amount must be an exact integer minor-unit value with no decimals or separators.",
    });
  }
  return value;
}

export function isPositiveMinorAmount(value: string) {
  return isMinorAmount(value) && BigInt(value) > BigInt(0);
}

export function assertPositiveMinorAmount(value: string) {
  assertMinorAmount(value);
  if (BigInt(value) <= BigInt(0)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Amount must be greater than zero for an original operational record.",
    });
  }
  return value;
}

export function compareMinor(left: string, right: string) {
  const a = BigInt(left);
  const b = BigInt(right);
  return a === b ? 0 : a > b ? 1 : -1;
}

export function subtractMinor(left: string, right: string) {
  return (BigInt(left) - BigInt(right)).toString();
}

export function addMinor(left: string, right: string) {
  return (BigInt(left) + BigInt(right)).toString();
}

export function minimumMinor(left: string, right: string) {
  return compareMinor(left, right) <= 0 ? left : right;
}

export function remainingMinor(total: string, alreadyAllocated: string) {
  const remaining = BigInt(total) - BigInt(alreadyAllocated);
  return (remaining > BigInt(0) ? remaining : BigInt(0)).toString();
}
