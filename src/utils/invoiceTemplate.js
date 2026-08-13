// ---------------------------------------------------------------------------
// Invoice template download.
//
// Administration opens this in Word, fills in the amount and any extra lines,
// then sends it to the client. It is a Word-readable HTML document rather than
// a real .docx so the app carries no document-generation dependency — Word
// opens it and every field stays editable, which is all this needs to do.
// ---------------------------------------------------------------------------

import { PAYMENT_MILESTONES } from "./paymentTerms.js";

const COMPANY = {
  name: "GEOTECH 3D",
  tagline: "Geospatial Hub",
  address: "33 Street 103, Maadi Al Khabiri Al Wasti, Maadi, Cairo, Egypt",
  phone: "0225261800",
  email: "cairo@geotech3d.com",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Short, human reference: GT3D-INV-<project>-<milestone>. */
export function buildInvoiceReference(project, milestoneId) {
  const projectPart = String(project?.id || "PRJ").replace(/[^A-Za-z0-9-]/g, "");
  return `GT3D-INV-${projectPart}-${String(milestoneId).slice(0, 3).toUpperCase()}`;
}

function buildInvoiceHtml({ project, milestoneId, percent, preparedBy }) {
  const milestone = PAYMENT_MILESTONES.find((m) => m.id === milestoneId);
  const reference = buildInvoiceReference(project, milestoneId);
  const row = (label, value) => `
      <tr>
        <td class="k">${escapeHtml(label)}</td>
        <td class="v">${escapeHtml(value)}</td>
      </tr>`;

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(reference)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: Calibri, Arial, sans-serif; color: #17202f; font-size: 11pt; }
  .brand { border-bottom: 3px solid #a0840d; padding-bottom: 10px; margin-bottom: 22px; }
  .brand h1 { margin: 0; font-size: 22pt; letter-spacing: 1px; }
  .brand small { color: #a0840d; font-weight: bold; letter-spacing: 3px; font-size: 9pt; }
  .brand p { margin: 6px 0 0; color: #657386; font-size: 9pt; }
  h2 { font-size: 15pt; margin: 0 0 4px; }
  .ref { color: #657386; font-size: 10pt; margin: 0 0 18px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  td, th { border: 1px solid #d8e0ea; padding: 8px 10px; vertical-align: top; }
  .k { width: 34%; background: #f8fafc; font-weight: bold; }
  th { background: #1c1b19; color: #ffffff; text-align: left; }
  .fill { color: #b45309; font-style: italic; }
  .total td { background: #f8fafc; font-weight: bold; }
  .note { color: #657386; font-size: 9pt; border-top: 1px solid #d8e0ea; padding-top: 10px; }
</style>
</head>
<body>

<div class="brand">
  <h1>${escapeHtml(COMPANY.name)}</h1>
  <small>${escapeHtml(COMPANY.tagline.toUpperCase())}</small>
  <p>${escapeHtml(COMPANY.address)}<br>
     Tel. ${escapeHtml(COMPANY.phone)} &nbsp;|&nbsp; ${escapeHtml(COMPANY.email)}</p>
</div>

<h2>Invoice — ${escapeHtml(milestone?.label || milestoneId)}</h2>
<p class="ref">Reference ${escapeHtml(reference)} &nbsp;·&nbsp; Issued ${escapeHtml(today())}</p>

<table>
  ${row("Client", project?.client || "")}
  ${row("Project", `${project?.id || ""} — ${project?.name || ""}`)}
  ${row("Delivering team", project?.teamLabel || "")}
  ${row("Payment stage", milestone?.label || milestoneId)}
  ${row("Stage share of contract", `${percent}%`)}
</table>

<table>
  <tr><th>Description</th><th style="width:22%">Amount</th></tr>
  <tr>
    <td>
      ${escapeHtml(milestone?.label || milestoneId)} payment — ${escapeHtml(percent)}% of the
      contract value for ${escapeHtml(project?.name || "the project")}.
      <br><span class="fill">[ add any further detail here ]</span>
    </td>
    <td class="fill">[ amount ]</td>
  </tr>
  <tr><td>Subtotal</td><td class="fill">[ amount ]</td></tr>
  <tr><td>VAT</td><td class="fill">[ amount ]</td></tr>
  <tr class="total"><td>Total due</td><td class="fill">[ amount ]</td></tr>
</table>

<table>
  ${row("Payment due date", "")}
  ${row("Bank / transfer details", "")}
</table>

<p class="note">
  Prepared by ${escapeHtml(preparedBy || "Administration")} · ${escapeHtml(COMPANY.name)}.
  Fill in the amounts and any additional detail before sending to the client.
</p>

</body>
</html>`;
}

/** Build the template and hand it to the browser as a Word download. */
export function downloadInvoiceTemplate({ project, milestoneId, percent, preparedBy }) {
  const html = buildInvoiceHtml({ project, milestoneId, percent, preparedBy });
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${buildInvoiceReference(project, milestoneId)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
