import { CalendarDays, CheckCircle2, CircleAlert, Download, ListOrdered, Users } from "lucide-react";
import { KpiCard } from "./KpiCard.jsx";
import { EmptyState, SectionTitle, StatusBadge } from "./ui.jsx";
import { formatTime, getAttendanceStatus, isoToday } from "../utils/dateUtils.js";

export function AttendancePage({
  records,
  currentUser,
  canManageAttendance,
  onCheckIn,
  onCheckOut,
  onUpdateNote,
  onExport,
}) {
  const personId = currentUser?.employeeId || currentUser?.id;
  const todayRecord = records.find((record) => record.userId === personId && record.date === isoToday);
  const presentCount = records.filter((record) => ["Present", "Checked Out"].includes(getAttendanceStatus(record))).length;
  const lateCount = records.filter((record) => getAttendanceStatus(record) === "Late").length;

  return (
    <div className="stack">
      <section className="panel attendance-hero">
        <div>
          <SectionTitle
            icon={CalendarDays}
            title="Attendance & Field Presence"
            helper="Local MVP attendance for office, field, and management monitoring."
          />
          <div className="attendance-actions no-print">
            <button className="primary-button" type="button" onClick={onCheckIn} disabled={Boolean(todayRecord)}>
              Check In
            </button>
            <button className="secondary-button" type="button" onClick={onCheckOut} disabled={!todayRecord || Boolean(todayRecord.checkOut)}>
              Check Out
            </button>
            <button className="secondary-button" type="button" onClick={onExport}>
              <Download size={16} aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="attendance-status-card">
          <span>Today</span>
          <strong>{getAttendanceStatus(todayRecord)}</strong>
          <small>In {formatTime(todayRecord?.checkIn)} / Out {formatTime(todayRecord?.checkOut)}</small>
        </div>
      </section>

      <div className="kpi-grid compact-kpi-grid">
        <KpiCard icon={Users} label="Visible Records" value={records.length} helper={canManageAttendance ? "Team scope" : "Personal scope"} tone="blue" />
        <KpiCard icon={CheckCircle2} label="Present / Checked Out" value={presentCount} helper="Recorded attendance" tone="green" />
        <KpiCard icon={CircleAlert} label="Late Check-ins" value={lateCount} helper="After 09:30" tone="amber" />
      </div>

      <section className="panel">
        <SectionTitle icon={ListOrdered} title="Attendance Register" helper="Notes are stored locally and preserved on refresh." />
        {records.length ? (
          <div className="table-shell">
            <table className="task-table compact-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>
                      <strong>{record.userName}</strong>
                      <small>{record.department}</small>
                    </td>
                    <td>{formatTime(record.checkIn)}</td>
                    <td>{formatTime(record.checkOut)}</td>
                    <td><StatusBadge value={getAttendanceStatus(record)} /></td>
                    <td>{record.location}</td>
                    <td>
                      <input
                        value={record.notes || ""}
                        disabled={!canManageAttendance && record.userId !== personId}
                        onChange={(event) => onUpdateNote(record.id, event.target.value)}
                        placeholder="Field note"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No attendance records yet" text="Use Check In to create the first local attendance record." />
        )}
      </section>
    </div>
  );
}
