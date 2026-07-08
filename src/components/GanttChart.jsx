import { StatusBadge } from "./ui.jsx";

function toTime(date) {
  return new Date(`${date}T00:00:00`).getTime();
}

export function GanttChart({ tasks, projects, employees }) {
  const datedTasks = tasks.filter((task) => task.start && task.end);
  if (!datedTasks.length) {
    return <p className="muted">No dated tasks available for the timeline.</p>;
  }

  const min = Math.min(...datedTasks.map((task) => toTime(task.start)));
  const max = Math.max(...datedTasks.map((task) => toTime(task.end)));
  const span = Math.max(1, max - min);

  return (
    <div className="gantt">
      {datedTasks.map((task) => {
        const start = ((toTime(task.start) - min) / span) * 100;
        const width = Math.max(6, ((toTime(task.end) - toTime(task.start)) / span) * 100);
        const project = projects.find((item) => item.id === task.projectId);
        const assignee = employees.find((employee) => employee.id === task.assigneeId);

        return (
          <div className="gantt-row" key={task.id}>
            <div className="gantt-label">
              <strong>{task.title}</strong>
              <span>
                {project?.id} - {assignee?.name}
              </span>
            </div>
            <div className="gantt-lane">
              <span className="gantt-bar" style={{ left: `${start}%`, width: `${width}%` }}>
                {task.progress}%
              </span>
            </div>
            <StatusBadge value={task.status} />
          </div>
        );
      })}
    </div>
  );
}

