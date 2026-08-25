import { describe, expect, it } from "vitest";
import { registerStorageProxy } from "./_core/storageProxy";

describe("managed storage proxy", () => {
  it("registers the scoped controlled-file route separately from the raw managed-storage fallback", async () => {
    const routes = new Map<string, (req: unknown, res: { status: (code: number) => { send: (body: string) => void } }) => Promise<void>>();
    registerStorageProxy({ get: (path: string, handler: (req: unknown, res: { status: (code: number) => { send: (body: string) => void } }) => Promise<void>) => routes.set(path, handler) } as never);
    const response: { statusCode?: number; body?: string; status: (code: number) => { send: (body: string) => void } } = { status: code => { response.statusCode = code; return { send: body => { response.body = body; } }; } };

    expect(routes.has("/api/control-files/grant/:token")).toBe(true);
    await routes.get("/manus-storage/*")?.({}, response);
    expect(response).toEqual({ statusCode: 404, body: "Use an authorised controlled-file access grant.", status: expect.any(Function) });
  });
});
