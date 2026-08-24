import { createContext, useContext } from "react";
import type { ControlScope } from "@/lib/control";

const ControlScopeContext = createContext<ControlScope | null>(null);

export function ControlScopeProvider({ scope, children }: { scope: ControlScope; children: React.ReactNode }) {
  return <ControlScopeContext.Provider value={scope}>{children}</ControlScopeContext.Provider>;
}

export function useControlScope() {
  const scope = useContext(ControlScopeContext);
  if (!scope) throw new Error("useControlScope must be used within ControlScopeProvider");
  return scope;
}
