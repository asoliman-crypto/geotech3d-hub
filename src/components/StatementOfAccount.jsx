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

// The statement is a document: it always prints (and shows) as white paper,
// whatever theme the app is in. The same rules style the in-app preview and
// the print window, so what you see is what prints.
const SOA_DOC_CSS = `
.soa-doc{--soa-ink:#1d1a15;--soa-muted:#6b665d;--soa-line:#e4ded2;--soa-gold:#a0840d;
  box-sizing:border-box;width:100%;max-width:960px;margin:0 auto;padding:36px 40px;background:#fff;color:var(--soa-ink);
  font-family:"Segoe UI",Inter,Arial,sans-serif;font-size:12.5px;line-height:1.45;border-radius:14px;
  box-shadow:0 18px 50px rgba(0,0,0,.18)}
.soa-doc *{box-sizing:border-box}
.soa-doc .soa-top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:18px;border-bottom:3px solid var(--soa-gold)}
.soa-doc .soa-logo{height:46px;width:auto;display:block}
.soa-doc .soa-issuer{margin-top:8px;color:var(--soa-muted);font-size:11px;font-weight:600;text-align:left}
.soa-doc .soa-title{text-align:right}
.soa-doc .soa-title h1{margin:0;font-size:22px;letter-spacing:.08em;color:var(--soa-ink)}
.soa-doc .soa-title p{margin:4px 0 0;color:var(--soa-muted);font-size:11.5px}
.soa-doc .soa-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}
.soa-doc .soa-meta div{padding:10px 12px;border:1px solid var(--soa-line);border-radius:8px}
.soa-doc .soa-meta span{display:block;color:var(--soa-muted);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.soa-doc .soa-meta strong{display:block;margin-top:2px;font-size:13.5px;color:var(--soa-ink);overflow-wrap:anywhere}
.soa-doc .soa-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin-bottom:20px;border:1px solid var(--soa-line);border-radius:8px;overflow:hidden}
.soa-doc .soa-summary div{padding:12px 14px;border-right:1px solid var(--soa-line)}
.soa-doc .soa-summary div:last-child{border-right:0;background:#fbf6e4}
.soa-doc .soa-summary span{display:block;color:var(--soa-muted);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.soa-doc .soa-summary strong{display:block;margin-top:3px;font-size:16px;color:var(--soa-ink);white-space:nowrap}
.soa-doc .soa-summary div:last-child strong{color:#8a5a00;font-size:18px}
.soa-doc h2{break-after:avoid;page-break-after:avoid;margin:22px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--soa-gold)}
.soa-doc table{width:100%;border-collapse:collapse}
.soa-doc th{padding:8px 8px;background:#2a251e;color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-align:left;text-transform:uppercase}
.soa-doc td{padding:8px 8px;border-bottom:1px solid var(--soa-line);color:var(--soa-ink);vertical-align:top}
.soa-doc tbody tr:nth-child(even) td{background:#faf8f3}
.soa-doc .soa-date{white-space:nowrap}
.soa-doc .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.soa-doc .soa-proj{font-weight:700}
.soa-doc .soa-sub{display:block;color:var(--soa-muted);font-size:11px}
.soa-doc .soa-pay td{color:#0b6e57}
.soa-doc .soa-pay td.soa-cell-text{color:var(--soa-ink)}
.soa-doc tfoot td{border-top:2px solid var(--soa-ink);border-bottom:0;font-weight:800;background:#fff}
.soa-doc .soa-empty{padding:18px;border:1px dashed var(--soa-line);border-radius:8px;color:var(--soa-muted);text-align:center}
.soa-doc .soa-age{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--soa-line);border-radius:8px;overflow:hidden}
.soa-doc .soa-age div{padding:9px 12px;border-right:1px solid var(--soa-line)}
.soa-doc .soa-age div:last-child{border-right:0;background:#fbf6e4}
.soa-doc .soa-age span{display:block;color:var(--soa-muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.soa-doc .soa-age strong{display:block;margin-top:2px;white-space:nowrap}
.soa-doc .soa-foot{display:flex;justify-content:space-between;gap:16px;margin-top:26px;padding-top:12px;border-top:1px solid var(--soa-line);color:var(--soa-muted);font-size:10.5px}
@media screen and (max-width:720px){
  .soa-doc{padding:20px 16px}
  .soa-doc .soa-top{flex-direction:column}
  .soa-doc .soa-title{text-align:left}
  .soa-doc .soa-meta,.soa-doc .soa-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .soa-doc .soa-summary div:nth-child(2){border-right:0}
  .soa-doc .soa-summary div:nth-child(-n+2){border-bottom:1px solid var(--soa-line)}
  .soa-doc .soa-age{grid-template-columns:repeat(2,minmax(0,1fr))}
  .soa-doc .soa-table-wrap{overflow-x:auto}
  .soa-doc table{min-width:640px}
}
`;

const PRINT_PAGE_CSS = `
@page{size:A4;margin:12mm}
html,body{margin:0;background:#fff}
.soa-doc{max-width:none;padding:0;border-radius:0;box-shadow:none}
.soa-doc tr{break-inside:avoid}
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
      ["Project", scopeProject ? `${scopeProject.id} ${scopeProject.name}` : "All projects"],
      ["Statement date", asOf],
      [],
      ["Date", "Reference", "Project", "Stage", "Description", "Debit (invoiced)", "Credit (received)", "Balance"],
      ...statement.rows.map((r) => [
        formatStatementDate(r.date),
        r.type === "invoice" ? r.ref : "",
        `${r.projectId} ${r.projectName}`,
        r.stage,
        r.type === "invoice" ? "Invoice" : "Payment received",
        r.debit || "",
        r.credit || "",
        r.balance,
      ]),
      [],
      ["", "", "", "", "Total", statement.totals.invoiced, statement.totals.received, statement.totals.balance],
      [],
      ["Contract value", statement.totals.contract],
      ["Not invoiced yet", statement.totals.notInvoiced],
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
          <p>Pick a client to see every invoice and payment with the running balance, then print it or save it as PDF.</p>
        </div>
        {account ? (
          <div className="soa-actions">
            <button type="button" className="secondary-button" onClick={exportCsv}>
              <Download size={16} /> Excel
            </button>
            <button type="button" className="primary-button" onClick={printStatement}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        ) : null}
      </header>

      {!accounts.length ? (
        <div className="fd-empty">
          <strong>Nothing to show yet</strong>
          <p>A statement appears here once a project with a contract value has its first invoice uploaded.</p>
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
                <span className="soa-client-sub">
                  {a.projects.length} project{a.projects.length === 1 ? "" : "s"} · {a.currency}
                </span>
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
                <option value="">All projects ({account.projects.length})</option>
                {account.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name}
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
                    <p>As of {asOf}</p>
                  </div>
                </div>

                <div className="soa-meta">
                  <div>
                    <span>Client</span>
                    <strong dir="auto">{account.client}</strong>
                  </div>
                  <div>
                    <span>Currency</span>
                    <strong>{account.currency}</strong>
                  </div>
                  <div>
                    <span>Projects</span>
                    <strong dir="auto">
                      {scopeProject ? `${scopeProject.id} · ${scopeProject.name}` : `All (${account.projects.length})`}
                    </strong>
                  </div>
                  <div>
                    <span>Statement date</span>
                    <strong>{asOf}</strong>
                  </div>
                </div>

                <div className="soa-summary">
                  <div>
                    <span>Contract value</span>
                    <strong>{formatMoney(statement.totals.contract, account.currency)}</strong>
                  </div>
                  <div>
                    <span>Total invoiced</span>
                    <strong>{formatMoney(statement.totals.invoiced, account.currency)}</strong>
                  </div>
                  <div>
                    <span>Total received</span>
                    <strong>{formatMoney(statement.totals.received, account.currency)}</strong>
                  </div>
                  <div>
                    <span>Balance due</span>
                    <strong>{formatMoney(statement.totals.balance, account.currency)}</strong>
                  </div>
                </div>

                <h2>Transactions</h2>
                {statement.rows.length ? (
                  <div className="soa-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Reference</th>
                          <th>Project / stage</th>
                          <th className="num">Invoiced</th>
                          <th className="num">Received</th>
                          <th className="num">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.rows.map((r, i) => (
                          <tr key={`${r.projectId}-${r.milestoneId}-${r.type}-${i}`} className={r.type === "payment" ? "soa-pay" : ""}>
                            <td className="soa-cell-text soa-date">{formatStatementDate(r.date)}</td>
                            <td>
                              {r.type === "invoice" ? (r.ref ? `Invoice ${r.ref}` : "Invoice") : "Payment received"}
                            </td>
                            <td className="soa-cell-text">
                              <span className="soa-proj" dir="auto">{r.projectName}</span>
                              <span className="soa-sub">
                                {r.projectId} · {r.stage}
                              </span>
                            </td>
                            <td className="num">{r.debit ? formatMoney(r.debit, account.currency) : ""}</td>
                            <td className="num">{r.credit ? formatMoney(r.credit, account.currency) : ""}</td>
                            <td className="num soa-cell-text">{formatMoney(r.balance, account.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}>Total</td>
                          <td className="num">{formatMoney(statement.totals.invoiced, account.currency)}</td>
                          <td className="num">{formatMoney(statement.totals.received, account.currency)}</td>
                          <td className="num">{formatMoney(statement.totals.balance, account.currency)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="soa-empty">No invoice has been issued yet.</div>
                )}

                <h2>Outstanding by age</h2>
                <div className="soa-age">
                  <div>
                    <span>0–30 days</span>
                    <strong>{formatMoney(statement.ageing.current, account.currency)}</strong>
                  </div>
                  <div>
                    <span>31–60 days</span>
                    <strong>{formatMoney(statement.ageing.d31, account.currency)}</strong>
                  </div>
                  <div>
                    <span>61–90 days</span>
                    <strong>{formatMoney(statement.ageing.d61, account.currency)}</strong>
                  </div>
                  <div>
                    <span>Over 90 days</span>
                    <strong>{formatMoney(statement.ageing.d90, account.currency)}</strong>
                  </div>
                  <div>
                    <span>Total due</span>
                    <strong>{formatMoney(statement.totals.balance, account.currency)}</strong>
                  </div>
                </div>

                <h2>Projects</h2>
                <div className="soa-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th className="num">Contract</th>
                        <th className="num">Invoiced</th>
                        <th className="num">Received</th>
                        <th className="num">Balance due</th>
                        <th className="num">Not invoiced yet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.projects.map((p) => (
                        <tr key={p.id}>
                          <td className="soa-cell-text">
                            <span className="soa-proj" dir="auto">{p.name}</span>
                            <span className="soa-sub">
                              {p.id} · {p.status}
                            </span>
                          </td>
                          <td className="num">{formatMoney(p.contract, account.currency)}</td>
                          <td className="num">{formatMoney(p.invoiced, account.currency)}</td>
                          <td className="num">{formatMoney(p.received, account.currency)}</td>
                          <td className="num">{formatMoney(p.balance, account.currency)}</td>
                          <td className="num">{formatMoney(p.notInvoiced, account.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="soa-foot">
                  <span>Please quote the invoice reference with your payment.</span>
                  <span>Generated by GEOTECH 3D · Geospatial Hub · {asOf}</span>
                </div>
              </article>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
