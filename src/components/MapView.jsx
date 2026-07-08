import { FolderKanban, MapPin } from "lucide-react";
import { Badge, EmptyState, ProgressBar, SectionTitle, StatusBadge } from "./ui.jsx";

export function MapView({ projects, employees, onOpenProject }) {
  const regions = [...new Set(projects.map((project) => project.geo.region))];
  const locatedCount = projects.filter((project) => project.geo.located).length;

  return (
    <div className="stack">
      <section className="panel map-panel">
        <SectionTitle
          icon={MapPin}
          title="Geospatial Project Map"
          helper="Regional monitoring with project pins projected from each project's real coordinates."
        />
        <div className="map-legend no-print">
          <span><i style={{ background: "#a0840d" }} aria-hidden="true" /> Active / In progress</span>
          <span><i style={{ background: "#c0362c" }} aria-hidden="true" /> Delayed / Blocked</span>
          <span><i style={{ background: "#0f8f72" }} aria-hidden="true" /> Completed</span>
          <span className="map-legend-meta">{locatedCount}/{projects.length} located</span>
        </div>
        <div className="map-layout">
          <div className="geo-map-canvas" aria-label="Regional project map">
            <svg viewBox="0 0 100 70" role="img" aria-label="GEOTECH 3D regional project distribution">
              <defs>
                <pattern id="geo-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(160,132,13,.16)" strokeWidth=".35" />
                </pattern>
              </defs>
              <rect width="100" height="70" rx="4" fill="url(#geo-grid)" />
              <path d="M8 53 C20 41 27 46 38 34 C52 19 63 22 74 12 C84 3 93 8 96 18" fill="none" stroke="rgba(160,132,13,.42)" strokeWidth="1.1" />
              <path d="M4 31 C17 23 29 25 41 18 C54 10 67 12 86 5" fill="none" stroke="rgba(98,99,102,.22)" strokeWidth=".8" />
              <path d="M16 64 C28 56 42 59 53 48 C64 37 75 42 92 30" fill="none" stroke="rgba(98,99,102,.2)" strokeWidth=".8" />
              {projects.map((project) => {
                const statusClass = project.geo.located
                  ? `map-${project.status?.toLowerCase().replaceAll(" ", "-") || "active"}`
                  : "map-unmapped";
                return (
                  <g key={project.id}>
                    <circle cx={project.geo.x} cy={project.geo.y} r="4.8" className={`map-pulse ${statusClass}`} />
                    <circle cx={project.geo.x} cy={project.geo.y} r="2.2" className="map-pin-core" />
                    <text x={project.geo.x + 4} y={project.geo.y - 4}>{project.id}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="map-region-stack">
            {regions.map((region) => (
              <div className="map-region-card" key={region}>
                <strong>{region}</strong>
                <span>{projects.filter((project) => project.geo.region === region).length} projects</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={FolderKanban} title="Regional Project Cards" helper="Open any project directly from the map list." />
        {projects.length ? (
          <div className="map-project-grid">
            {projects.map((project) => {
              const manager = employees.find((employee) => employee.id === project.managerId);
              return (
                <article className="map-project-card" key={project.id}>
                  <div>
                    <Badge tone="neutral">{project.geo.region}</Badge>
                    <StatusBadge value={project.status} />
                  </div>
                  <h3>{project.name}</h3>
                  <p>
                    {project.geo.city} - {project.geo.coordinates}
                    {project.geo.located ? "" : " (location pending)"}
                  </p>
                  <div className="map-card-meta">
                    <span>Manager</span>
                    <strong>{manager?.name || "Unassigned"}</strong>
                  </div>
                  <div className="map-card-meta">
                    <span>Tasks</span>
                    <strong>{project.taskCount}</strong>
                  </div>
                  <ProgressBar value={project.progress} />
                  <button className="secondary-button" type="button" onClick={() => onOpenProject(project.id)}>
                    Open Project
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No project locations" text="Create or seed projects to visualize them on the regional map." />
        )}
      </section>
    </div>
  );
}
