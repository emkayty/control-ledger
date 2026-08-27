import { jsPDF } from "jspdf";
import { formatMoney } from "./control";

export type VariancePdfCase = { id: string; title: string; status: string; type: string; severity: string; dueAt: Date | null; valueImpactMinor: string | number; currency: string | null; resolutionNote: string | null };
export type VariancePdfAttachment = { originalName: string; contentType: string; sizeBytes: number };
export type VariancePdfNote = { body: string; createdAt: Date; correlationId: string; attachments?: VariancePdfAttachment[] };
export type VariancePdfSuggestion = { confidence: string; proposal: unknown; createdAt: Date; correlationId: string };
export type VariancePdfDecision = { decision: string; rationale: string; createdAt: Date; correlationId: string; actorName: string | null };

export type VariancePdfReportModel = {
  organisationName: string;
  branchName: string;
  exportedAt: Date;
  variance: VariancePdfCase;
  notes: VariancePdfNote[];
  suggestions: VariancePdfSuggestion[];
  decisions: VariancePdfDecision[];
};

function normalise(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "variance"; }
function safeText(value: unknown) { return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim(); }
function proposalText(proposal: unknown) {
  if (!proposal || typeof proposal !== "object") return "No structured AI proposal text is available.";
  const record = proposal as Record<string, unknown>;
  const summary = safeText(record.summary);
  const causes = Array.isArray(record.potentialCauses) ? record.potentialCauses.map(item => {
    const cause = item as Record<string, unknown>; return `${safeText(cause.label)} — ${safeText(cause.rationale)}`;
  }).filter(Boolean) : [];
  const matches = Array.isArray(record.possibleMatches) ? record.possibleMatches.map(item => {
    const match = item as Record<string, unknown>; return `${safeText(match.candidateKey)} — ${safeText(match.rationale)}`;
  }).filter(Boolean) : [];
  const steps = Array.isArray(record.reviewSteps) ? record.reviewSteps.map(safeText).filter(Boolean) : [];
  return [summary, causes.length ? `Potential causes: ${causes.join("; ")}` : "", matches.length ? `Possible matches: ${matches.join("; ")}` : "", steps.length ? `Review steps: ${steps.join("; ")}` : ""].filter(Boolean).join("\n");
}

export function varianceReportFilename(model: VariancePdfReportModel) {
  return `control-ledger-${normalise(model.organisationName)}-${normalise(model.branchName)}-${normalise(model.variance.title)}-${model.exportedAt.toISOString().slice(0, 10)}.pdf`;
}

export function downloadVariancePdfReport(model: VariancePdfReportModel) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 40; let y = margin;
  const header = () => { doc.setFillColor(7, 37, 43); doc.rect(0, 0, pageWidth, 72, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(232, 253, 250); doc.text("Control Ledger", margin, 32); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text("Variance investigation report · read-only export", margin, 49); y = 96; doc.setTextColor(19, 41, 45); };
  const nextPage = () => { doc.addPage(); header(); };
  const ensureSpace = (height: number) => { if (y + height > pageHeight - margin) nextPage(); };
  const text = (value: string, options: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => { const lines = doc.splitTextToSize(safeText(value), pageWidth - margin * 2); const height = Math.max(11, lines.length * ((options.size ?? 9) + 2)); ensureSpace(height); doc.setFont("helvetica", options.bold ? "bold" : "normal"); doc.setFontSize(options.size ?? 9); doc.setTextColor(...(options.color ?? [19, 41, 45])); doc.text(lines, margin, y); y += height; };
  const section = (title: string) => { ensureSpace(30); doc.setDrawColor(192, 230, 223); doc.line(margin, y, pageWidth - margin, y); y += 17; doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(12, 111, 102); doc.text(title, margin, y); y += 18; };
  header();
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(19, 41, 45); doc.text("Variance report", margin, y); y += 20;
  text(`Organisation: ${model.organisationName} · Branch: ${model.branchName}`, { size: 8.5, color: [74, 95, 98] });
  text(`Generated UTC: ${model.exportedAt.toISOString()}`, { size: 8.5, color: [74, 95, 98] }); y += 7;
  section("Case facts");
  text(`${model.variance.title} · ${model.variance.status.replaceAll("_", " ")} · ${model.variance.type.replaceAll("_", " ")} · severity ${model.variance.severity}`, { bold: true, size: 10 });
  text(`Value impact: ${formatMoney(String(model.variance.valueImpactMinor), model.variance.currency ?? "NGN")} · Due: ${model.variance.dueAt ? model.variance.dueAt.toISOString() : "not set"}`);
  text(`Case reference: ${model.variance.id}`, { size: 8.5, color: [74, 95, 98] });
  if (model.variance.resolutionNote) text(`Latest proposed resolution: ${model.variance.resolutionNote}`);
  section("AI investigation suggestions");
  if (!model.suggestions.length) text("No saved AI suggestion exists for this case. AI suggestions are user-requested investigation aids only and do not settle, reconcile, resolve, post, or approve.", { color: [74, 95, 98] });
  model.suggestions.forEach((suggestion, index) => { text(`Suggestion ${index + 1} · confidence ${suggestion.confidence} · ${suggestion.createdAt.toISOString()}`, { bold: true, size: 9 }); text(proposalText(suggestion.proposal)); text(`Correlation: ${suggestion.correlationId}`, { size: 8, color: [74, 95, 98] }); y += 4; });
  section("Investigation notes and attachment references");
  if (!model.notes.length) text("No investigation notes have been recorded.", { color: [74, 95, 98] });
  model.notes.forEach((note, index) => { text(`Note ${index + 1} · ${note.createdAt.toISOString()}`, { bold: true, size: 9 }); text(note.body); text(note.attachments?.length ? `Attachments (metadata only): ${note.attachments.map(attachment => `${attachment.originalName} [${attachment.contentType}, ${attachment.sizeBytes} bytes]`).join("; ")}` : "No attachments.", { size: 8.5, color: [74, 95, 98] }); text(`Correlation: ${note.correlationId}`, { size: 8, color: [74, 95, 98] }); y += 4; });
  section("Controlled decision history");
  if (!model.decisions.length) text("No controlled decision has been submitted for this case.", { color: [74, 95, 98] });
  model.decisions.forEach((decision, index) => { text(`Decision ${index + 1} · ${decision.decision} · ${decision.actorName || "Authorised user"} · ${decision.createdAt.toISOString()}`, { bold: true, size: 9 }); text(decision.rationale); text(`Correlation: ${decision.correlationId}`, { size: 8, color: [74, 95, 98] }); y += 4; });
  section("Control boundary");
  text("This report is a read-only investigation export. It does not prove payment, settlement, reconciliation, resolution, approval, or posting. Attachment bytes, thumbnails, storage keys, and temporary viewing links are intentionally excluded.", { size: 8.5, color: [74, 95, 98] });
  doc.setProperties({ title: `Control Ledger variance report · ${model.variance.title}`, subject: "Read-only variance investigation export", author: "Control Ledger" });
  doc.save(varianceReportFilename(model));
}
