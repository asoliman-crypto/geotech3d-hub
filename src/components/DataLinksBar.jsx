import { ExternalLink } from "lucide-react";
import { normalizeUrl } from "../utils/linkUtils.js";

export function DataLinksBar({ links }) {
  if (!links?.length) {
    return <p className="muted">No project data links yet.</p>;
  }

  return (
    <div className="data-link-bar">
      {links.map((link) => (
        <a href={normalizeUrl(link.url)} target="_blank" rel="noreferrer" key={link.id}>
          <ExternalLink size={15} aria-hidden="true" />
          {link.title || "Open link"}
        </a>
      ))}
    </div>
  );
}

