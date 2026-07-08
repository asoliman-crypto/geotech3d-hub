import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FileText,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { KpiCard } from "./KpiCard.jsx";
import { Badge, EmptyState, ExportBar, SectionTitle } from "./ui.jsx";
import { isTaskComplete } from "../utils/projectLogic.js";

export function ReportsCenter({ dailyReport, weeklyReport, projects, tasks, workload, onExportWeekly, onPrint }) {
  const overloaded = workload.filter((person) => person.status === "Overloaded").length;
  const completedRate = tasks.length
    ? Math.round((tasks.filter(isTaskComplete).length / tasks.length) * 100)
    : 0;
  const delayedRate = projects.length
    ? Math.round((projects.filter((project) => project.status === "Delayed").length / projects.length) * 100)
    : 0;

  return (
    <div className="stack">
      <section className="panel report-command-center">
        <div className="panel-head-row">
          <SectionTitle
            icon={BarChart3}
            title="Executive Reports Center"
            helper="Weekly productivity, delivery risk, attendance signals, and export-ready summaries."
          />
          <ExportBar onExportCsv={onExportWeekly} csvLabel="Export Weekly CSV" onPrint={onPrint} />
        </div>
        <div className="kpi-grid compact-kpi-grid">
          <KpiCard icon={CheckCircle2} label="Week Completed Tasks" value={weeklyReport.completedThisWeek.length} helper={`Week of ${weeklyReport.weekStart}`} tone="green" />
          <KpiCard icon={CircleAlert} label="Delayed Project Rate" value={`${delayedRate}%`} helper={`${weeklyReport.delayed.length} delayed projects`} tone="red" />
          <KpiCard icon={Users} label="Overloaded People" value={overloaded} helper="Based on task capacity" tone="amber" />
          <KpiCard icon={TrendingUp} label="Task Completion Rate" value={`${completedRate}%`} helper={`${tasks.length} visible tasks`} tone="purple" />
        </div>
      </section>

      <section className="executive-grid">
        <div className="panel">
          <SectionTitle icon={FileText} title="Daily Snapshot" helper="Today compared with the start-of-day baseline." />
          <div className="report-summary-list">
            <div><span>Projects worked today</span><strong>{dailyReport.projectsWorkedCount}</strong></div>
            <div><span>Tasks completed today</span><strong>{dailyReport.tasksCompletedCount}</strong></div>
            <div><span>Average gain today</span><strong>+{dailyReport.avgGain}%</strong></div>
            <div><span>Overall completion</span><strong>{dailyReport.overallProgress}%</strong></div>
          </div>
        </div>

        <div className="panel">
          <SectionTitle icon={CalendarDays} title="Weekly Operations" helper="Current-week movement and blockers." />
          <div className="report-summary-list">
            <div><span>Active attendance records</span><strong>{weeklyReport.attendanceThisWeek.length}</strong></div>
            <div><span>Late check-ins</span><strong>{weeklyReport.lateCount}</strong></div>
            <div><span>Blocked or revision tasks</span><strong>{weeklyReport.blockedTasks.length}</strong></div>
            <div><span>Delayed projects</span><strong>{weeklyReport.delayed.length}</strong></div>
          </div>
        </div>

        <div className="panel">
          <SectionTitle icon={Users} title="Team Activity" helper="Most active people this week." />
          {weeklyReport.teamActivity.length ? (
            <div className="mini-table-list">
              {weeklyReport.teamActivity.slice(0, 8).map((row) => (
                <div className="mini-table-row" key={row.id}>
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.department}</span>
                  </div>
                  <Badge tone="success">{row.completed} done</Badge>
                  <Badge tone="warning">{row.active} active</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No weekly task movement" text="Updated or completed tasks will appear here." />
          )}
        </div>

        <div className="panel">
          <SectionTitle icon={ShieldCheck} title="Permission Matrix" helper="Current MVP access model ready for backend replacement." />
          <div className="permission-matrix">
            {[
              ["Admin / GM", "Users, settings, projects, tasks, approvals, audit"],
              ["Manager", "Projects, tasks, reports, workload, review"],
              ["CEO", "Executive monitoring, reports, map, audit read-only"],
              ["External / Regional / Monitor", "Project visibility, comments, task requests"],
              ["Employee", "Assigned tasks, attendance, limited projects"],
            ].map(([role, access]) => (
              <div key={role}>
                <strong>{role}</strong>
                <span>{access}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
