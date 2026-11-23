// ---------------------------------------------------------------------------
// Statement of Account (SOA)
//
// Built from the collection flow that already lives on each project:
//   • an uploaded stage invoice  → a debit  (the client owes that stage)
//   • a stage marked paid        → a credit (the client paid it)
// One statement per client and currency — dirhams and riyals are never mixed.
// ---------------------------------------------------------------------------

import {
  FILE_KINDS,
  PAYMENT_MILESTONES,
  getActiveMilestones,
  getContractValue,
  getCurrency,
  getPaymentTerms,
  getStageAmount,
  getStageFiles,
} from "./paymentTerms.js";

export const NO_CLIENT_KEY = "__no-client__";

export function getClientKey(project) {
  const name = String(project?.client || "").trim().replace(/\s+/g, " ");
  return name ? name.toLowerCase() : NO_CLIENT_KEY;
}

export function getClientLabel(project) {
  const name = String(project?.client || "").trim().replace(/\s+/g, " ");
  return name ? name.toUpperCase() : "Client not set";
}

// Invoice files are named after the accounting system's number
// (e.g. "فاتورة - 20260030 - GEOTECH …"). Use that number as the reference;
// a file without one simply has no reference on the statement.
export function getInvoiceRefs(files) {
  const refs = [];
  for (const file of files) {
    const match = String(file?.name || "").match(/(?:^|\D)(\d{6,10})(?!\d)/);
    if (match && !refs.includes(match[1])) refs.push(match[1]);
  }
  return refs;
}

function toTime(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : 0;
}

/**
 * Every invoice and payment across the given projects, plus each project's
 * contract figures, grouped into accounts by client + currency.
 */
export function buildAccounts(projects) {
  const accounts = new Map();

  for (const project of projects) {
    const contract = getContractValue(project);
    if (!(contract > 0)) continue;
    const milestones = getActiveMilestones(project);
    if (!milestones.length) continue;

    const currency = getCurrency(project);
    const key = `${getClientKey(project)}|${currency}`;
    const account =
      accounts.get(key) ||
      {
        key,
        clientKey: getClientKey(project),
        client: getClientLabel(project),
        currency,
        projects: [],
        entries: [],
      };
    accounts.set(key, account);

    const terms = getPaymentTerms(project);
    let invoiced = 0;
    let received = 0;

    for (const milestone of milestones) {
      const amount = getStageAmount(project, milestone.id);
      const entry = terms[milestone.id];
      const invoices = getStageFiles(project, milestone.id, FILE_KINDS.invoice);
      const proofs = getStageFiles(project, milestone.id, FILE_KINDS.proof);
      if (!invoices.length && !entry.paid) continue;

      const invoiceDate = invoices[0]?.uploadedAt || entry.paidAt || "";
      const stage = `${milestone.label} (${entry.percent}%)`;
      const refs = getInvoiceRefs(invoices);
      account.entries.push({
        type: "invoice",
        date: invoiceDate,
        ref: refs.join(", "),
        projectId: project.id,
        projectName: project.name,
        milestoneId: milestone.id,
        stage,
        debit: amount,
        credit: 0,
        paid: entry.paid,
      });
      invoiced += amount;

      if (entry.paid) {
        account.entries.push({
          type: "payment",
          date: entry.paidAt || invoiceDate,
          ref: refs.length ? `Payment · ${refs.join(", ")}` : "Payment",
          projectId: project.id,
          projectName: project.name,
          milestoneId: milestone.id,
          stage,
          debit: 0,
          credit: amount,
          hasProof: proofs.length > 0,
        });
        received += amount;
      }
    }

    // A project the client has never been invoiced for is not on the statement.
    if (!invoiced) continue;
    account.projects.push({
      id: project.id,
      name: project.name,
      status: project.status,
      contract,
      invoiced,
      received,
      balance: invoiced - received,
      notInvoiced: Math.max(0, contract - invoiced),
    });
  }

  const currencyOrder = (code) => (code === "AED" ? 0 : code === "SAR" ? 1 : 2);
  const list = [...accounts.values()]
    .filter((account) => account.projects.length)
    .map((account) => summarise(account));
  // Dirhams first, then the biggest outstanding balance; "client not set" last.
  return list.sort(
    (a, b) =>
      (a.clientKey === NO_CLIENT_KEY) - (b.clientKey === NO_CLIENT_KEY) ||
      currencyOrder(a.currency) - currencyOrder(b.currency) ||
      b.totals.balance - a.totals.balance ||
      a.client.localeCompare(b.client),
  );
}

function summarise(account) {
  const totals = account.projects.reduce(
    (sum, p) => ({
      contract: sum.contract + p.contract,
      invoiced: sum.invoiced + p.invoiced,
      received: sum.received + p.received,
      balance: sum.balance + p.balance,
      notInvoiced: sum.notInvoiced + p.notInvoiced,
    }),
    { contract: 0, invoiced: 0, received: 0, balance: 0, notInvoiced: 0 },
  );
  return { ...account, totals };
}

/**
 * The statement for one account, optionally narrowed to one project:
 * one line per invoice, grouped by project, with whether it has been paid,
 * and three totals — invoiced, paid, balance due.
 */
export function buildStatement(account, { projectId = "" } = {}) {
  const invoices = account.entries.filter(
    (e) => e.type === "invoice" && (!projectId || e.projectId === projectId),
  );
  // Each project's invoices sit together (projects in the order they were
  // first invoiced), stages in contract order within a project.
  const firstInvoiced = {};
  for (const e of invoices) {
    const t = toTime(e.date);
    if (!(e.projectId in firstInvoiced) || t < firstInvoiced[e.projectId]) firstInvoiced[e.projectId] = t;
  }
  const stageOrder = (id) => PAYMENT_MILESTONES.findIndex((m) => m.id === id);
  const rows = invoices.sort(
    (a, b) =>
      firstInvoiced[a.projectId] - firstInvoiced[b.projectId] ||
      a.projectId.localeCompare(b.projectId) ||
      stageOrder(a.milestoneId) - stageOrder(b.milestoneId),
  );
  const invoiced = rows.reduce((sum, r) => sum + r.debit, 0);
  const paid = rows.reduce((sum, r) => sum + (r.paid ? r.debit : 0), 0);
  return { rows, totals: { invoiced, paid, balance: invoiced - paid } };
}

export function formatStatementDate(value) {
  const t = toTime(value);
  if (!t) return "—";
  return new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
