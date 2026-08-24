import { labelStatus, statusTone } from "@/lib/control";

export function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] ring-1 ring-inset ${statusTone(status)}`}>{labelStatus(status)}</span>;
}
