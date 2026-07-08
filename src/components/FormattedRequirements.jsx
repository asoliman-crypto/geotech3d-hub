import { NEW_LINE } from "../data/demoData.js";

export function FormattedRequirements({ text }) {
  const lines = String(text || "")
    .split(NEW_LINE)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return <p className="muted">No requirements added yet.</p>;
  }

  return (
    <div className="requirements-list">
      {lines.map((line, index) => {
        const checklist = /^\[[ x]\]/i.test(line);
        const numbered = /^\d+\./.test(line);
        const cleaned = line.replace(/^[-*]\s*/, "").replace(/^\[[ x]\]\s*/i, "");
        return (
          <div className="requirement-line" key={`${line}-${index}`}>
            <span className={checklist ? "check-box" : "requirement-marker"}>
              {checklist ? "" : numbered ? `${index + 1}` : ""}
            </span>
            <span>{cleaned}</span>
          </div>
        );
      })}
    </div>
  );
}

