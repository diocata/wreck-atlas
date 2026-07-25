"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Crosshair, ExternalLink, MapPin, Waves, X } from "lucide-react";
import { wreckSchema, type Wreck } from "@/lib/domain/wreck";
import { useAtlasStore } from "@/stores/atlas-store-provider";

export function WreckDetailPanel() {
  const selected = useAtlasStore((state) => state.selectedWreckId);
  const setSelected = useAtlasStore((state) => state.setSelected);
  const [wreck, setWreck] = useState<Wreck | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setWreck(null);
    setExpanded(false);
    if (!selected) {
      setStatus("idle");
      return;
    }

    let current = true;
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/wrecks/${selected}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? wreckSchema.safeParse(await response.json()) : null))
      .then((parsed) => {
        if (!current) return;
        if (parsed?.success) {
          setWreck(parsed.data);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (current && !controller.signal.aborted) setStatus("error");
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [selected]);

  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 700px)").matches) {
      requestAnimationFrame(() => close.current?.focus());
    }
  }, [selected, status]);

  if (!selected) return null;

  if (status === "loading") {
    return (
      <aside className="detail-panel loading-panel" aria-live="polite">
        <button
          ref={close}
          className="icon-button"
          onClick={() => setSelected(null)}
          aria-label="Close details"
        >
          <X size={18} />
        </button>
        <span>Acquiring wreck signal…</span>
      </aside>
    );
  }

  if (status === "error") {
    return (
      <aside className="detail-panel loading-panel" aria-live="assertive">
        <button
          ref={close}
          className="icon-button"
          onClick={() => setSelected(null)}
          aria-label="Close details"
        >
          <X size={18} />
        </button>
        <span>This wreck signal could not be loaded.</span>
        <button
          className="retry"
          onClick={() => {
            const id = selected;
            setSelected(null);
            requestAnimationFrame(() => setSelected(id));
          }}
        >
          Retry
        </button>
      </aside>
    );
  }

  if (!wreck) return null;

  const provenance =
    wreck.provenance === "ukho-derived" ? "UKHO-derived record" : "Historical reference";

  return (
    <aside className="detail-panel" aria-label={`${wreck.name} details`}>
      <div className="sheet-handle" />
      <button
        ref={close}
        className="icon-button close-panel"
        onClick={() => setSelected(null)}
        aria-label="Close details"
      >
        <X size={18} />
      </button>
      <div className="panel-kicker">
        <Crosshair size={14} />
        Signal confirmed
        <span>{provenance}</span>
      </div>
      <h1>{wreck.name}</h1>
      <p className="record-type">{wreck.type}</p>
      <div className="facts">
        <span><MapPin size={15} /> {wreck.sunkYear ?? "Year unknown"}</span>
        <span><Waves size={15} /> {wreck.depthM !== null ? `${wreck.depthM.toLocaleString()} m` : "Depth unknown"}</span>
      </div>
      <p className="story">{wreck.story}</p>
      <button
        className="expand-button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide source notes" : "View source notes"}
        <ChevronDown size={16} />
      </button>
      {expanded && (
        <div className="expanded">
          <p>{wreck.surveyNotes}</p>
          <dl>
            <dt>Source</dt>
            <dd>{wreck.source}</dd>
            <dt>Record ID</dt>
            <dd>{wreck.sourceId}</dd>
            <dt>Licence</dt>
            <dd>{wreck.licence}</dd>
          </dl>
        </div>
      )}
      <div className="coordinates">
        <span>POSITION {wreck.approximatePosition ? "· APPROXIMATE" : ""}</span>
        <code>
          {Math.abs(wreck.coordinates[1]).toFixed(4)}° {wreck.coordinates[1] >= 0 ? "N" : "S"} ·{" "}
          {Math.abs(wreck.coordinates[0]).toFixed(4)}° {wreck.coordinates[0] >= 0 ? "E" : "W"}
        </code>
      </div>
      {wreck.sourceUrl ? (
        <a className="source-link" href={wreck.sourceUrl} target="_blank" rel="noreferrer">
          UKHO source information <ExternalLink size={14} />
        </a>
      ) : (
        <p className="source-warning">Verify this reference record with the relevant authority.</p>
      )}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px dashed rgba(0, 0, 0, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "9px",
          fontFamily: '"SFMono-Regular", Consolas, monospace',
          color: "var(--muted)",
          letterSpacing: "0.02em",
        }}
      >
        <span>MARKER ICON</span>
        <a
          href="https://www.flaticon.com/free-animated-icon/ship_19018550"
          target="_blank"
          rel="noopener noreferrer"
          title="Ship icon created by Magnific - Flaticon"
          style={{ color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--cyan)", opacity: 0.8 }}
        >
          FLATICON (MAGNIFIC)
        </a>
      </div>
    </aside>
  );
}
