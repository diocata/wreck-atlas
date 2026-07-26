"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Anchor,
  ExternalLink,
  Info,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  type AtlasGuideSection,
} from "@/features/atlas/model/atlas-store";
import { useAtlasStore } from "@/features/atlas/model/atlas-store-provider";

export function AtlasGuidePanel() {
  const open = useAtlasStore((state) => state.atlasGuideOpen);
  const initialSection = useAtlasStore((state) => state.atlasGuideSection);
  const closeGuide = useAtlasStore((state) => state.closeAtlasGuide);
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const about = useRef<HTMLDivElement>(null);
  const reading = useRef<HTMLDivElement>(null);
  const data = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const scrollToSection = useCallback((
    section: AtlasGuideSection | "reading",
    behavior: ScrollBehavior = "smooth",
  ) => {
    const target = section === "about"
      ? about.current
      : section === "reading"
        ? reading.current
        : data.current;

    if (!target || !dialog.current) return;
    dialog.current.scrollTo({
      top: Math.max(0, target.offsetTop - 92),
      behavior,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusFrame = requestAnimationFrame(() => close.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeGuide();
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
  }, [closeGuide, open]);

  useEffect(() => {
    if (!open) return;

    const scrollFrame = requestAnimationFrame(() => {
      scrollToSection(initialSection, "auto");
    });
    return () => cancelAnimationFrame(scrollFrame);
  }, [initialSection, open, scrollToSection]);

  if (!open) return null;

  return (
    <div
      className="atlas-guide-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeGuide();
      }}
    >
      <section
        ref={dialog}
        className="atlas-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="atlas-guide-title"
      >
        <button
          ref={close}
          type="button"
          className="icon-button"
          onClick={closeGuide}
          aria-label="Close Atlas Guide"
        >
          <X size={18} />
        </button>

        <div ref={about} className="atlas-guide-lead">
          <div className="atlas-guide-kicker">
            <Anchor size={14} />
            Atlas field guide · 102,625 signals
          </div>
          <h2 id="atlas-guide-title">
            Find a wreck.
            <span>Keep the source in view.</span>
          </h2>
          <p>
            Wreck Atlas turns a specialist public dataset into a map for
            historical discovery. Search for a known wreck, tune the visible
            records, or let the atlas choose a documented signal for you.
          </p>
        </div>

        <nav className="atlas-guide-index" aria-label="Atlas Guide sections">
          <button type="button" onClick={() => scrollToSection("about")}>
            Why
          </button>
          <button type="button" onClick={() => scrollToSection("reading")}>
            Read the map
          </button>
          <button type="button" onClick={() => scrollToSection("data")}>
            Data & limits
          </button>
        </nav>

        <div className="atlas-guide-section atlas-guide-why">
          <h3>Why this atlas exists</h3>
          <p>
            Official wreck records carry valuable geographic, survey, and
            historical evidence, but bulk source files are difficult to
            explore casually. This atlas keeps discovery, the surviving
            record, and its provenance together on one map.
          </p>
        </div>

        <div className="atlas-guide-steps" aria-label="How to explore">
          <div>
            <Search size={16} />
            <span><b>Find</b> Search a reported vessel name.</span>
          </div>
          <div>
            <SlidersHorizontal size={16} />
            <span><b>Tune</b> Filter era, type, or recorded depth.</span>
          </div>
          <div>
            <MapPin size={16} />
            <span><b>Inspect</b> Open the record without leaving the map.</span>
          </div>
        </div>

        <div
          ref={reading}
          className="atlas-guide-section atlas-guide-reading"
        >
          <h3>How to read the signals</h3>
          <div className="signal-key">
            <div>
              <span className="signal-key-cluster">448</span>
              <p>
                <b>Cluster</b>
                Recorded positions grouped at the current map scale.
              </p>
            </div>
            <div>
              <span className="signal-key-wreck" aria-hidden="true">⚓</span>
              <p>
                <b>Source record</b>
                A wreck or obstruction at its recorded position.
              </p>
            </div>
            <div>
              <span className="signal-key-selected" aria-hidden="true" />
              <p>
                <b>Locked signal</b>
                The record currently open in the detail sheet.
              </p>
            </div>
          </div>
        </div>

        <div ref={data} className="atlas-guide-section atlas-guide-data">
          <div className="atlas-guide-kicker">
            <Info size={14} />
            Data signal · July 2026
          </div>
          <h3>Data, gaps, and responsibility</h3>
          <p>
            The atlas presents 102,625 published records from the UK
            Hydrographic Office Global Wrecks and Obstructions release. It
            does not fill gaps the source does not answer.
          </p>

          <div className="atlas-guide-note">
            <h4>Incomplete does not mean invalid</h4>
            <p>
              A name, sinking year, category, or normalized depth may not be
              reported. Those fields remain unknown; the atlas does not infer
              facts or discard the record.
            </p>
          </div>
          <div className="atlas-guide-note">
            <h4>Recorded positions and depths</h4>
            <p>
              Coordinates, depths, and survey descriptions may be
              approximate, historical, incomplete, or superseded. Nearby
              distances compare recorded positions in a straight line.
            </p>
          </div>
          <div className="atlas-guide-warning">
            <h4>Not for marine navigation</h4>
            <p>
              Never use this atlas for navigation, diving decisions,
              clearance calculations, or operational planning. Consult
              current official charts and the relevant maritime authority.
            </p>
          </div>
          <p className="atlas-guide-attribution">
            Contains public sector information, licensed under the Open
            Government Licence v3.0, from the UK Hydrographic Office.
          </p>
        </div>

        <div className="atlas-guide-links">
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
