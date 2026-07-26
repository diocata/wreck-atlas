"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, Info, X } from "lucide-react";
import { useAtlasStore } from "@/features/atlas/model/atlas-store-provider";

export function AboutDataPanel() {
  const open = useAtlasStore((state) => state.aboutPanelOpen);
  const setOpen = useAtlasStore((state) => state.setAboutPanelOpen);
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusFrame = requestAnimationFrame(() => close.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;

      const focusable = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
      previousFocus.current = null;
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="data-guide-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        ref={dialog}
        className="data-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-guide-title"
      >
        <button
          ref={close}
          type="button"
          className="icon-button"
          onClick={() => setOpen(false)}
          aria-label="Close data guide"
        >
          <X size={18} />
        </button>
        <div className="data-guide-kicker">
          <Info size={14} />
          Data signal · July 2026
        </div>
        <h2 id="data-guide-title">What this atlas is showing</h2>
        <p className="data-guide-intro">
          Wreck Atlas presents 102,625 published records from the UK
          Hydrographic Office Global Wrecks and Obstructions release. It makes
          the source easier to explore without filling gaps the source does not
          answer.
        </p>

        <div className="data-guide-section">
          <h3>Incomplete does not mean invalid</h3>
          <p>
            Many records do not report a vessel name, sinking year, category,
            or normalized depth. Those fields remain explicitly unknown. The
            atlas does not infer historical facts or discard a record because
            its surviving information is limited.
          </p>
        </div>

        <div className="data-guide-section">
          <h3>Recorded positions and depths</h3>
          <p>
            Coordinates, depths, classifications, and survey descriptions may
            be approximate, incomplete, historical, or superseded. Nearby
            distances are straight-line comparisons between recorded
            positions.
          </p>
        </div>

        <div className="data-guide-section data-guide-warning">
          <h3>Not for marine navigation</h3>
          <p>
            Never use this atlas for navigation, diving decisions, clearance
            calculations, or operational planning. Consult current official
            charts and the relevant maritime authority.
          </p>
        </div>

        <div className="data-guide-links">
          <a
            href="https://www.admiralty.co.uk/access-data/marine-data"
            target="_blank"
            rel="noreferrer"
          >
            UKHO marine data <ExternalLink size={13} />
          </a>
          <a
            href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
            target="_blank"
            rel="noreferrer"
          >
            Open Government Licence v3.0 <ExternalLink size={13} />
          </a>
          <a
            href="https://openfreemap.org/"
            target="_blank"
            rel="noreferrer"
          >
            OpenFreeMap <ExternalLink size={13} />
          </a>
        </div>
      </section>
    </div>
  );
}
