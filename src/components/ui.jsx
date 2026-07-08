import { CheckCircle2, CircleAlert, CircleDashed, Clock3, Download, Printer } from "lucide-react";

const statusIcon = {
  Active: Clock3,
  Completed: CheckCircle2,
  Delayed: CircleAlert,
  "In Progress": Clock3,
  "In Review": Clock3,
  Planning: CircleDashed,
  "Pending Approval": Clock3,
  "Pending Review": Clock3,
  "QC Pending Review": Clock3,
  Approved: CheckCircle2,
  Rejected: CircleAlert,
  "Needs Revision": CircleAlert,
  "QC Accepted": CheckCircle2,
  "QC Rejected": CircleAlert,
  "Not Submitted": CircleDashed,
  "Modification Requested": CircleAlert,
  "On Hold": CircleAlert,
  "Waiting for Data": CircleAlert,
  Cancelled: CircleAlert,
  Done: CheckCircle2,
  Blocked: CircleAlert,
  "Under Review": Clock3,
  "To Do": CircleDashed,
};

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ value }) {
  const Icon = statusIcon[value] || CircleDashed;
  const tone =
    value === "Completed" || value === "Done" || value === "Accepted" || value === "QC Accepted"
      ? "success"
      : value === "Delayed" ||
          value === "Blocked" ||
          value === "Overloaded" ||
          value === "Rejected" ||
          value === "Needs Revision" ||
          value === "QC Rejected" ||
          value === "Cancelled"
        ? "danger"
      : value === "In Progress" ||
            value === "Under Review" ||
            value === "In Review" ||
            value === "Busy" ||
            value === "Pending Approval" ||
            value === "Pending Review" ||
            value === "QC Pending Review" ||
            value === "Modification Requested"
          ? "warning"
          : value === "Available" || value === "Active" || value === "Approved"
            ? "success"
            : "neutral";

  return (
    <span className={`status-pill badge-${tone}`}>
      <Icon size={14} aria-hidden="true" />
      {value}
    </span>
  );
}

export function PriorityBadge({ value }) {
  const tone = value === "High" ? "danger" : value === "Medium" ? "warning" : "success";
  return <Badge tone={tone}>{value}</Badge>;
}

export function ProgressBar({ value }) {
  const safeValue = Math.min(100, Math.max(0, Number(value || 0)));
  return (
    <div className="progress-wrap" aria-label={`${safeValue}% progress`}>
      <div className="progress-track">
        <span className="progress-fill" style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{safeValue}%</strong>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function SectionTitle({ icon: Icon, title, helper }) {
  return (
    <div className="section-title">
      <div>
        {Icon ? <Icon size={20} aria-hidden="true" /> : null}
        <h2>{title}</h2>
      </div>
      {helper ? <p>{helper}</p> : null}
    </div>
  );
}

export function ExportBar({ onExportCsv, csvLabel = "Export CSV", onPrint }) {
  return (
    <div className="export-bar no-print">
      {onExportCsv ? (
        <button type="button" className="secondary-button" onClick={onExportCsv}>
          <Download size={16} aria-hidden="true" />
          {csvLabel}
        </button>
      ) : null}
      {onPrint ? (
        <button type="button" className="secondary-button" onClick={onPrint}>
          <Printer size={16} aria-hidden="true" />
          Print / PDF
        </button>
      ) : null}
    </div>
  );
}
