import { useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import geoBrandLogo from "../assets/brand/geotech3d-logo-full.svg";
import { formatMoney } from "../utils/paymentTerms.js";
import {
  buildAccounts,
  buildStatement,
  formatStatementDate,
} from "../utils/statement.js";

// The statement is a document: it always shows (and prints) as white paper,
// whatever theme the app is in. The same rules style the in-app preview and
// the printout, so what you see is what prints.
const SOA_DOC_CSS = `
.soa-doc{--soa-ink:#1d1a15;--soa-muted:#6b665d;--soa-line:#e8e2d6;--soa-gold:#a0840d;
  box-sizing:border-box;width:100%;max-width:760px;margin:0 auto;padding:34px 38px;background:#fff;color:var(--soa-ink);
  font-family:"Segoe UI",Inter,Arial,sans-serif;font-size:14px;line-height:1.45;border-radius:14px;
  box-shadow:0 18px 50px rgba(0,0,0,.18)}
.soa-doc *{box-sizing:border-box}
.soa-doc .soa-top{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:14px;border-bottom:3px solid var(--soa-gold)}
.soa-doc .soa-logo{height:40px;width:auto;display:block}
.soa-doc .soa-title{text-align:right}
.soa-doc .soa-title h1{margin:0;font-size:18px;letter-spacing:.08em;color:var(--soa-ink)}
.soa-doc .soa-title p{margin:2px 0 0;color:var(--soa-muted);font-size:12px}
.soa-doc .soa-client-line{margin:22px 0 12px;font-size:22px;font-weight:800;color:var(--soa-ink)}
.soa-doc table{width:100%;border-collapse:collapse}
.soa-doc th{padding:8px 10px;border-bottom:2px solid var(--soa-ink);color:var(--soa-muted);font-size:11px;font-weight:700;letter-spacing:.05em;text-align:left;text-transform:uppercase}
.soa-doc td{padding:11px 10px;border-bottom:1px solid var(--soa-line);color:var(--soa-ink)}
.soa-doc .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.soa-doc .soa-stage{color:var(--soa-muted)}
.soa-doc .paid{color:#0b6e57;font-weight:700}
.soa-doc .unpaid{color:#a15c00;font-weight:700}
.soa-doc .soa-due{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:18px;padding:14px 16px;border-radius:10px;background:#fbf6e4}
.soa-doc .soa-due span{font-weight:800}
.soa-doc .soa-due strong{color:#8a5a00;font-size:22px;white-space:nowrap}
.soa-doc .soa-empty{padding:18px;color:var(--soa-muted);text-align:center}
@media screen and (max-width:720px){
  .soa-doc{padding:20px 16px;font-size:13px}
  .soa-doc .soa-top{flex-direction:column;align-items:flex-start}
  .soa-doc .soa-title{text-align:left}
  .soa-doc .soa-table-wrap{overflow-x:auto}
  .soa-doc table{min-width:460px}
}
`;

const PRINT_PAGE_CSS = `
@page{size:A4;margin:12mm}
html,body{margin:0;background:#fff}
.soa-doc{max-width:none;padding:0;border-radius:0;box-shadow:none}
.soa-doc tr,.soa-doc .soa-totals{break-inside:avoid}
.soa-doc thead{display:table-header-group}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
`;

function safeName(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function StatementOfAccount({ projects }) {
  const accounts = useMemo(() => buildAccounts(projects), [projects]);
  const [accountKey, setAccountKey] = useState("");
  const docRef = useRef(null);

  const account = accounts.find((a) => a.key === accountKey) || accounts[0] || null;
  const statement = useMemo(
    () => (account ? buildStatement(account) : null),
    [account],
  );
  const asOf = formatStatementDate(new Date().toISOString());
  const logoUrl = new URL(geoBrandLogo, window.location.href).href;
  const money = (value) => formatMoney(value, account?.currency);

  // Print through a hidden frame rather than a pop-up window, so pop-up
  // blockers never get in the way. "Save as PDF" in the print dialog gives
  // the PDF.
  const printStatement = () => {
    if (!docRef.current || !account) return;
    const title = `SOA - ${account.client} - ${account.currency} - ${todayStamp()}`;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
        `<style>${SOA_DOC_CSS}${PRINT_PAGE_CSS}</style></head><body>${docRef.current.outerHTML}</body></html>`,
    );
    doc.close();

    const pageTitle = document.title;
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      document.title = pageTitle;
      frame.remove();
    };
    const go = () => {
      // The PDF file name comes from the page title.
      document.title = title;
      frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(cleanup, 60000);
    };
    const img = doc.querySelector("img");
    if (img && !img.complete) {
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
    } else {
      setTimeout(go, 100);
    }
  };

  const exportCsv = () => {
    if (!account || !statement) return;
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Statement of Account", account.client, asOf],
      [],
      ["Invoice No.", "Project", "Stage", "Amount", "Status"],
      ...statement.rows.map((r) => [r.ref, r.projectName, r.stage, r.debit, r.paid ? "Paid" : "Unpaid"]),
      [],
      ["", "", "Balance due", statement.totals.balance],
    ];
    const csv = "﻿" + lines.map((row) => row.map(cell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOA_${safeName(account.client)}_${account.currency}_${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="soa-board">
      <style>{SOA_DOC_CSS}</style>
      <header className="soa-head">
        <h2>Statement of Account</h2>
        {account ? (
          <div className="soa-actions">
            <button type="button" className="secondary-button" onClick={exportCsv}>
              <Download size={16} /> Excel
            </button>
            <button type="button" className="primary-button" onClick={printStatement}>
              <Printer size={16} /> Print / PDF
            </button>
          </div>
        ) : null}
      </header>

      {!accounts.length ? (
        <div className="fd-empty">
          <strong>No invoices yet</strong>
        </div>
      ) : (
        <>
          <div className="soa-clients" role="tablist" aria-label="Clients">
            {accounts.map((a) => (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={a.key === account?.key}
                className={`soa-client${a.key === account?.key ? " active" : ""}`}
                onClick={() => setAccountKey(a.key)}
              >
                <span className="soa-client-name">{a.client}</span>
                <strong className={a.totals.balance > 0 ? "due" : "clear"}>
                  {a.totals.balance > 0 ? formatMoney(a.totals.balance, a.currency) : "Settled"}
                </strong>
              </button>
            ))}
          </div>

          {account && statement ? (
            <div className="soa-paper">
              <article className="soa-doc" ref={docRef}>
                <div className="soa-top">
                  <img className="soa-logo" src={logoUrl} alt="GEOTECH 3D" />
                  <div className="soa-title">
                    <h1>STATEMENT OF ACCOUNT</h1>
                    <p>{asOf}</p>
                  </div>
                </div>

                <div className="soa-client-line" dir="auto">{account.client}</div>

                {statement.rows.length ? (
                  <div className="soa-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Project</th>
                          <th className="num">Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.rows.map((r) => (
                          <tr key={`${r.projectId}-${r.milestoneId}`}>
                            <td>{r.ref || "—"}</td>
                            <td dir="auto">
                              {r.projectName} <span className="soa-stage">· {r.stage.replace(/ \(.*\)$/, "")}</span>
                            </td>
                            <td className="num">{money(r.debit)}</td>
                            <td className={r.paid ? "paid" : "unpaid"}>{r.paid ? "Paid" : "Unpaid"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="soa-empty">No invoices yet.</div>
                )}

                <div className="soa-due">
                  <span>Balance due</span>
                  <strong>{money(statement.totals.balance)}</strong>
                </div>
              </article>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
