// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "./LanguageContext";

function LanguageProbe() {
  const { language, setLanguage, t } = useLanguage();
  return <><p>{language}</p><p>{t("varianceCentre")}</p><p>{t("aiVarianceActive")}</p><button onClick={() => setLanguage("ha")}>Hausa</button></>;
}

describe("language preference", () => {
  it("switches the curated core copy to Hausa and persists the browser-only preference", () => {
    window.localStorage.clear();
    render(<LanguageProvider><LanguageProbe /></LanguageProvider>);
    expect(screen.getByText("Variance centre")).toBeTruthy();
    expect(screen.getByText("AI variance assistance active")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hausa" }));
    expect(screen.getByText("Cibiyar bambanci")).toBeTruthy();
    expect(screen.getByText("Taimakon AI na bambanci yana aiki")).toBeTruthy();
    expect(window.localStorage.getItem("control-ledger.language")).toBe("ha");
    expect(document.documentElement.lang).toBe("ha");
  });
});
