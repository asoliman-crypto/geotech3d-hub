// Mouse-following light for the glass theme.
//
// Tells the glass element under the pointer where the pointer is, as the CSS
// variables --mx / --my, so its ::before highlight can sit right under the
// cursor like light catching a pane of glass. Purely visual: it never touches
// layout, state or events beyond reading the pointer position.

export const GLASS_SURFACES = [
  ".pf-card",
  ".pf-pay-row",
  ".pf-dept",
  ".pf-tab",
  ".pf-invoices",
  ".pf-invoice-row",
  ".pf-open-ws",
  ".pf-terms-set",
  ".pf-terms-edit",
  ".pf-delete-project",
  ".pf-print-button",
  ".pf-add-button",
  ".ws-summary",
  ".ws-term",
  ".ws-file",
  ".ws-drop",
  ".sidebar-user",
  ".nav-list button",
  ".mini-action",
  ".secondary-button",
  ".primary-button",
].join(",");

export function attachGlassSheen(root = document) {
  let frame = 0;
  let pending = null;

  const paint = () => {
    frame = 0;
    if (!pending) return;
    const { target, x, y } = pending;
    const surface = target instanceof Element ? target.closest(GLASS_SURFACES) : null;
    if (!surface || !surface.closest(".theme-glass")) return;
    const rect = surface.getBoundingClientRect();
    surface.style.setProperty("--mx", `${x - rect.left}px`);
    surface.style.setProperty("--my", `${y - rect.top}px`);
  };

  const onMove = (event) => {
    pending = { target: event.target, x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(paint);
  };

  root.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    root.removeEventListener("pointermove", onMove);
    if (frame) cancelAnimationFrame(frame);
  };
}
