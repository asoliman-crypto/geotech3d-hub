// ---------------------------------------------------------------------------
// Payment terms and the collection flow for a project.
//
//   1. The PM records what share of the contract each stage carries.
//   2. The PM uploads the financial proposal, then each stage's invoice.
//      An uploaded invoice means that stage's money is now due.
//   3. Administration uploads the client's transfer proof and marks the stage
//      paid.
//   4. When every stage is paid, the project closes and moves to Historical.
//
// Documents live in project.files; each carries a `kind` (and a `milestone`
// for stage documents) so the right file lands in the right slot.
// ---------------------------------------------------------------------------

import { getProjectFiles } from "../lib/projectFiles.js";

export const PAYMENT_MILESTONES = [
  {
    id: "mobilization",
    label: "Mobilization",
    caption: "Billed when the team mobilises on the project",
  },
  {
    id: "delivery",
    label: "Delivery",
    caption: "Billed when the deliverables are handed over",
  },
  {
    id: "approval",
    label: "Approval",
    caption: "Billed once the client approves the work",
  },
];

export const FILE_KINDS = {
  proposal: "proposal",
  invoice: "invoice",
  proof: "proof",
  other: "other",
};

export function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

/**
 * Always hand back all three milestones, whatever shape the row has.
 * Every stored field is carried through — anything dropped here would be
 * erased the next time the terms are saved.
 */
export function getPaymentTerms(project) {
  const stored = project?.payment || {};
  const terms = {};
  for (const milestone of PAYMENT_MILESTONES) {
    const entry = stored[milestone.id] || {};
    terms[milestone.id] = {
      ...entry,
      percent: clampPercent(entry.percent),
      paid: Boolean(entry.paid),
      paidAt: entry.paidAt || "",
      paidBy: entry.paidBy || "",
    };
  }
  return terms;
}

export function hasPaymentTerms(project) {
  const terms = getPaymentTerms(project);
  return PAYMENT_MILESTONES.some((milestone) => terms[milestone.id].percent > 0);
}

export function getTermsTotal(project) {
  const terms = getPaymentTerms(project);
  return PAYMENT_MILESTONES.reduce((sum, m) => sum + terms[m.id].percent, 0);
}

/** Stages that actually carry part of the contract. */
export function getActiveMilestones(project) {
  const terms = getPaymentTerms(project);
  return PAYMENT_MILESTONES.filter((m) => terms[m.id].percent > 0);
}

// --- documents --------------------------------------------------------------

export function getKind(file) {
  return FILE_KINDS[file?.kind] ? file.kind : FILE_KINDS.other;
}

export function getProposalFile(project) {
  return getProjectFiles(project).find((file) => getKind(file) === FILE_KINDS.proposal) || null;
}

export function getStageFile(project, milestoneId, kind) {
  return (
    getProjectFiles(project).find(
      (file) => getKind(file) === kind && file.milestone === milestoneId,
    ) || null
  );
}

export function getOtherFiles(project) {
  return getProjectFiles(project).filter((file) => getKind(file) === FILE_KINDS.other);
}

// --- collection state -------------------------------------------------------

export const STAGE_STATE = {
  awaitingInvoice: "awaiting-invoice",
  paymentDue: "payment-due",
  paid: "paid",
};

export function getStageState(project, milestoneId) {
  const entry = getPaymentTerms(project)[milestoneId];
  if (entry?.paid) return STAGE_STATE.paid;
  if (getStageFile(project, milestoneId, FILE_KINDS.invoice)) return STAGE_STATE.paymentDue;
  return STAGE_STATE.awaitingInvoice;
}

export const STAGE_STATE_LABEL = {
  [STAGE_STATE.awaitingInvoice]: "Awaiting invoice",
  [STAGE_STATE.paymentDue]: "Payment due",
  [STAGE_STATE.paid]: "Paid",
};

export const STAGE_STATE_TONE = {
  [STAGE_STATE.awaitingInvoice]: "neutral",
  [STAGE_STATE.paymentDue]: "warning",
  [STAGE_STATE.paid]: "success",
};

/** Share of the contract the client has actually paid. */
export function getCollectedPercent(project) {
  const terms = getPaymentTerms(project);
  return PAYMENT_MILESTONES.reduce(
    (sum, m) => sum + (terms[m.id].paid ? terms[m.id].percent : 0),
    0,
  );
}

/** Every stage that carries a share of the contract has been paid. */
export function isFullyPaid(project) {
  const active = getActiveMilestones(project);
  if (!active.length) return false;
  const terms = getPaymentTerms(project);
  return active.every((m) => terms[m.id].paid);
}

/** Invoiced stages still waiting for the client's money — Administration's queue. */
export function getPaymentsToCollect(projects) {
  const due = [];
  for (const project of projects || []) {
    for (const milestone of getActiveMilestones(project)) {
      if (getStageState(project, milestone.id) !== STAGE_STATE.paymentDue) continue;
      const invoice = getStageFile(project, milestone.id, FILE_KINDS.invoice);
      due.push({
        project,
        milestone,
        percent: getPaymentTerms(project)[milestone.id].percent,
        invoice,
      });
    }
  }
  // Oldest invoice first — that money has been outstanding longest.
  return due.sort((a, b) =>
    String(a.invoice?.uploadedAt || "").localeCompare(String(b.invoice?.uploadedAt || "")),
  );
}

// --- contract value -----------------------------------------------------------

export const CURRENCIES = [
  { code: "AED", label: "UAE Dirham" },
  { code: "SAR", label: "Saudi Riyal" },
];
export const DEFAULT_CURRENCY = "AED";

/** Contract value as a number, or 0 when it has not been recorded. */
export function getContractValue(project) {
  const value = Number(project?.contractValue);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getCurrency(project) {
  return CURRENCIES.some((c) => c.code === project?.currency) ? project.currency : DEFAULT_CURRENCY;
}

/** Read a typed amount: tolerates thousands separators and spaces. */
export function parseAmount(input) {
  const value = Number(String(input ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

export function formatMoney(amount, currency = DEFAULT_CURRENCY, { compact = false } = {}) {
  const value = Number(amount) || 0;
  const number = new Intl.NumberFormat("en", compact
    ? { notation: "compact", maximumFractionDigits: 1 }
    : { maximumFractionDigits: 2 }).format(value);
  return `${currency} ${number}`;
}

/** What one stage is worth: its share of the contract value. */
export function getStageAmount(project, milestoneId) {
  const value = getContractValue(project);
  if (!value) return 0;
  const percent = getPaymentTerms(project)[milestoneId]?.percent || 0;
  return Math.round(value * percent) / 100;
}

/** Amount actually received so far. */
export function getCollectedAmount(project) {
  const terms = getPaymentTerms(project);
  return PAYMENT_MILESTONES.reduce(
    (sum, m) => sum + (terms[m.id].paid ? getStageAmount(project, m.id) : 0),
    0,
  );
}
