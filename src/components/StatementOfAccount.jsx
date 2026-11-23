import { useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import geoBrandLogo from "../assets/brand/geotech3d-logo-full.svg";
import { formatMoney } from "../utils/paymentTerms.js";
import {
  ISSUER_BY_CURRENCY,
  buildAccounts,
  buildStatement,
  formatStatementDate,
} from "../utils/statement.js";

// The statement is a document: it always shows (and prints) as white paper,
// whatever theme the app is in. The same rules style the in-app preview and
// the printout, so what you see is what prints.
const SOA_DOC_CSS = `
.soa-doc{--soa-ink:#1d1a15;--soa-muted:#6b665d;--soa-line:#e4ded2;--soa-gold:#a0840d;
  box-sizing:border-box;width:100%;max-width:900px;margin:0 auto;padding:36px 40px;background:#fff;color:var(--soa-ink);
  font-family:"Segoe UI",Inter,Arial,sans-serif;font-size:13px;line-height:1.45;border-radius:14px;
  box-shadow:0 18px 50px rgba(0,0,0,.18)}
.soa-doc *{box-sizing:border-box}
.soa-doc .soa-top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:16px;border-bottom:3px solid var(--soa-gold)}
.soa-doc .soa-logo{height:44px;width:auto;display:block}
.soa-doc .soa-issuer{margin-top:8px;color:var(--soa-muted);font-size:11px;font-weight:600;text-align:left}
.soa-doc .soa-title{text-align:right}
.soa-doc .soa-title h1{margin:0;font-size:21px;letter-spacing:.08em;color:var(--soa-ink)}
.soa-doc .soa-title p{margin:4px 0 0;color:var(--soa-muted);font-size:12px}
.soa-doc .soa-to{display:flex;justify-content:space-between;gap:16px;margin:20px 0 14px}
.soa-doc .soa-to span{display:block;color:var(--soa-muted);font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.soa-doc .soa-to strong{display:block;margin-top:2px;font-size:17px;color:var(--soa-ink)}
.soa-doc .soa-to .soa-to-right{text-align:right}
.soa-doc table{width:100%;border-collapse:collapse}
.soa-doc th{padding:9px 10px;background:#2a251e;color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em;text-align:left;text-transform:uppercase}
.soa-doc td{padding:10px;border-bottom:1px solid var(--soa-line);color:var(--soa-ink);vertical-align:top}
.soa-doc .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.soa-doc .soa-date{white-space:nowrap}
.soa-doc .soa-proj{font-weight:700}
.soa-doc .soa-sub{display:block;color:var(--soa-muted);font-size:11.5px}
.soa-doc .soa-status{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.soa-doc .soa-status.paid{background:#e3f4ee;color:#0b6e57}
.soa-doc .soa-status.unpaid{background:#fdf1dc;color:#8a5a00}
.soa-doc .soa-totals{width:300px;margin:16px 0 0 auto}
.soa-doc .soa-totals div{display:flex;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:1px solid var(--soa-line)}
.soa-doc .soa-totals span{color:var(--soa-muted);font-weight:600}
.soa-doc .soa-totals strong{white-space:nowrap}
.soa-doc .soa-totals .soa-due{margin-top:4px;padding:10px 12px;border:0;border-radius:8px;background:#fbf6e4}
.soa-doc .soa-totals .soa-due span{color:var(--soa-ink);font-weight:800}
.soa-doc .soa-totals .soa-due strong{color:#8a5a00;font-size:17px}
.soa-doc .soa-empty{padding:18px;border:1px dashed var(--soa-line);border-radius:8px;color:var(--soa-muted);text-align:center}
.soa-doc .soa-foot{margin-top:28px;padding-top:12px;border-top:1px solid var(--soa-line);color:var(--soa-muted);font-size:11px}
@media screen and (max-width:720px){
  .soa-doc{padding:20px 16px}
  .soa-doc .soa-top{flex-direction:column}
  .soa-doc .soa-title{text-align:left}
  .soa-doc .soa-table-wrap{overflow-x:auto}
  .soa-doc table{min-width:560px}
  .soa-doc .soa-totals{width:100%}
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
  const [projectId, setProjectId] = useState("");
  const docRef = useRef(null);

  const account = accounts.find((a) => a.key === accountKey) || accounts[0] || null;
  const statement = useMemo(
    () => (account ? buildStatement(account, { projectId }) : null),
    [account, projectId],
  );
  const asOf = formatStatementDate(new Date().toISOString());
  const logoUrl = new URL(geoBrandLogo, window.location.href).href;
  const scopeProject = projectId ? account?.projects.find((p) => p.id === projectId) : null;
  const money = (value) => formatMoney(value, account?.currency);

  const pickAccount = (key) => {
    setAccountKey(key);
    setProjectId("");
  };

  // Print through a hidden frame rather than a pop-up window, so pop-up
  // blockers never get in the way. "Save as PDF" in the print dialog gives
  // the PDF.
  const printStatement = () => {
    if (!docRef.current || !account) return;
    const title = `SOA - ${account.client} - ${account.currency}${scopeProject ? ` - ${scopeProject.id}` : ""} - ${todayStamp()}`;
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
      ["Statement of Account"],
      ["Client", account.client],
      ["Currency", account.currency],
      ["Date", asOf],
      [],
      ["Date", "Invoice No.", "Project", "Stage", "Amount", "Status"],
      ...statement.rows.map((r) => [
        formatStatementDate(r.date),
        r.ref,
        `${r.projectId} ${r.projectName}`,
        r.stage,
        r.debit,
        r.paid ? "Paid" : "Unpaid",
      ]),
      [],
      ["", "", "", "Total invoiced", statement.totals.invoiced],
      ["", "", "", "Paid", statement.totals.paid],
      ["", "", "", "Balance due", statement.totals.balance],
    ];
    const csv = "﻿" + lines.map((row) => row.map(cell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOA_${safeName(account.client)}_${account.currency}${scopeProject ? `_${scopeProject.id}` : ""}_${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="soa-board">
      <style>{SOA_DOC_CSS}</style>
      <header className="soa-head">
        <div>
          <span className="pf-board-kicker">Finance</span>
          <h2>Statement of Account</h2>
          <p>Choose a client.</p>
        </div>
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
          <p>A client appears here once one of their invoices is uploaded.</p>
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
                onClick={() => pickAccount(a.key)}
              >
                <span className="soa-client-name">{a.client}</span>
                <strong className={a.totals.balance > 0 ? "due" : "clear"}>
                  {a.totals.balance > 0 ? formatMoney(a.totals.balance, a.currency) : "Settled"}
                </strong>
              </button>
            ))}
          </div>

          {account && account.projects.length > 1 ? (
            <label className="soa-filter">
              <span>Project</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">All projects</option>
                {account.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {account && statement ? (
            <div className="soa-paper">
              <article className="soa-doc" ref={docRef}>
                <div className="soa-top">
                  <div>
                    <img className="soa-logo" src={logoUrl} alt="GEOTECH 3D" />
                    <div className="soa-issuer" dir="auto">
                      {ISSUER_BY_CURRENCY[account.currency] || "GEOTECH 3D"}
                    </div>
                  </div>
                  <div className="soa-title">
                    <h1>STATEMENT OF ACCOUNT</h1>
                    <p>{asOf}</p>
                  </div>
                </div>

                <div className="soa-to">
                  <div>
                    <span>Client</span>
                    <strong dir="auto">{account.client}</strong>
                  </div>
                  <div className="soa-to-right">
                    <span>{scopeProject ? "Project" : "Currency"}</span>
                    <strong dir="auto">{scopeProject ? scopeProject.name : account.currency}</strong>
                  </div>
                </div>

                {statement.rows.length ? (
                  <div className="soa-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice No.</th>
                          <th>Project</th>
                          <th className="num">Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.rows.map((r) => (
                          <tr key={`${r.projectId}-${r.milestoneId}`}>
                            <td className="soa-date">{formatStatementDate(r.date)}</td>
                            <td>{r.ref || "—"}</td>
                            <td>
                              <span className="soa-proj" dir="auto">{r.projectName}</span>
                              <span className="soa-sub">{r.stage}</span>
                            </td>
                            <td className="num">{money(r.debit)}</td>
                            <td>
                              <span className={`soa-status ${r.paid ? "paid" : "unpaid"}`}>
                                {r.paid ? "Paid" : "Unpaid"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="soa-empty">No invoice has been issued yet.</div>
                )}

                <div className="soa-totals">
                  <div>
                    <span>Total invoiced</span>
                    <strong>{money(statement.totals.invoiced)}</strong>
                  </div>
                  <div>
                    <span>Paid</span>
                    <strong>{money(statement.totals.paid)}</strong>
                  </div>
                  <div className="soa-due">
                    <span>Balance due</span>
                    <strong>{money(statement.totals.balance)}</strong>
                  </div>
                </div>

                <div className="soa-foot">Please quote the invoice number with your payment.</div>
              </article>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
