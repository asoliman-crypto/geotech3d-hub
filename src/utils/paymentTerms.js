// ---------------------------------------------------------------------------
// Payment terms for a project.
//
// Administration records what share of the contract is billed at each stage;
// the PM confirms when a stage is actually reached, which is what turns it
// into an invoice Administration has to raise.
// ---------------------------------------------------------------------------

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

export function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

/** Always hand back all three milestones, whatever shape the row has. */
export function getPaymentTerms(project) {
  const stored = project?.payment || {};
  const terms = {};
  for (const milestone of PAYMENT_MILESTONES) {
    const entry = stored[milestone.id] || {};
    terms[milestone.id] = {
      percent: clampPercent(entry.percent),
      reached: Boolean(entry.reached),
      reachedAt: entry.reachedAt || "",
      reachedBy: entry.reachedBy || "",
      invoicedAt: entry.invoicedAt || "",
      invoicedBy: entry.invoicedBy || "",
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

/** Percentage of the contract already confirmed as billable. */
export function getBilledPercent(project) {
  const terms = getPaymentTerms(project);
  return PAYMENT_MILESTONES.reduce(
    (sum, m) => sum + (terms[m.id].reached ? terms[m.id].percent : 0),
    0,
  );
}

/** Milestones the PM confirmed but Administration has not invoiced yet. */
export function getPendingInvoices(projects) {
  const pending = [];
  for (const project of projects || []) {
    const terms = getPaymentTerms(project);
    for (const milestone of PAYMENT_MILESTONES) {
      const entry = terms[milestone.id];
      if (entry.reached && !entry.invoicedAt) {
        pending.push({ project, milestone, entry });
      }
    }
  }
  // Oldest confirmation first — that is the one that has been waiting longest.
  return pending.sort((a, b) => String(a.entry.reachedAt).localeCompare(String(b.entry.reachedAt)));
}
