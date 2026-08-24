export type ControlScope = { organisationId: string; branchId: string; organisationName: string; branchName: string; role: string };

export const emptyScope = {
  organisationId: "00000000-0000-4000-8000-000000000000",
  branchId: "00000000-0000-4000-8000-000000000000",
};

export function formatMoney(minor: string | null | undefined, currency = "NGN") {
  const raw = String(minor ?? "0");
  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;
  const padded = digits.padStart(3, "0");
  const major = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = padded.slice(-2);
  return `${negative ? "−" : ""}${currency} ${major}.${cents}`;
}

export function statusTone(status: string) {
  if (["verified", "resolved", "settled"].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-600/15";
  if (["matched", "partially_paid", "recorded"].includes(status)) return "bg-sky-50 text-sky-700 ring-sky-600/15";
  if (["pending_approval", "investigating"].includes(status)) return "bg-amber-50 text-amber-700 ring-amber-600/15";
  return "bg-rose-50 text-rose-700 ring-rose-600/15";
}

export function labelStatus(status: string) { return status.replaceAll("_", " "); }
