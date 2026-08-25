import { describe, expect, it } from "vitest";
import { canExtractOpayReceipt, isImageReceipt } from "./receiptView";

describe("receipt preview and extraction eligibility", () => {
  it("allows previews for images and OPay extraction only for image receipts", () => {
    expect(isImageReceipt("image/webp")).toBe(true);
    expect(canExtractOpayReceipt("image/png")).toBe(true);
    expect(canExtractOpayReceipt("application/pdf")).toBe(false);
  });
});
