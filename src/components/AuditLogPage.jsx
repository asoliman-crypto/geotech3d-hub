import { Activity, ClipboardList } from "lucide-react";
import { Badge, EmptyState, SectionTitle } from "./ui.jsx";
import { formatDateTime } from "../utils/dateUtils.js";

export function AuditLogPage({ events }) {
  return (
    <section className="panel">
      <SectionTitle
        icon={ClipboardList}
        title="Audit Log"
        helper="Local audit trail for authentication, project, task, approval, user, attendance, and review events."
      />
      {events.length ? (
        <div className="audit-timeline">
          {events.map((event) => (
            <article className="audit-event" key={event.id}>
              <div className="audit-event-icon">
                <Activity size={16} aria-hidden="true" />
              </div>
              <div>
                <div className="audit-event-head">
                  <strong>{event.title}</strong>
                  <Badge tone="neutral">{event.type}</Badge>
                </div>
                <p>{event.message}</p>
                <small>
                  {formatDateTime(event.createdAt)} - {event.actorName} ({event.actorRole})
                </small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No audit events yet" text="Workspace actions will appear here automatically." />
      )}
    </section>
  );
}
