import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, copy, action }: { icon: LucideIcon; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="soft-card rounded-3xl border border-dashed bg-card px-6 py-14 text-center">
    <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="size-5" /></div>
    <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>;
}
