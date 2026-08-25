import type { Express } from "express";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    res.status(404).send("Use an authorised controlled-file access grant.");
  });
}
