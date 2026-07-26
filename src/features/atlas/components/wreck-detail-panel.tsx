"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Crosshair,
  ExternalLink,
  Link2,
  MapPin,
  RadioTower,
  Waves,
  X,
} from "lucide-react";
import { wreckSchema, type Wreck } from "@/domain/wreck";
import { copyText } from "@/features/atlas/model/clipboard";
import {
  findNearbyWrecks,
  type NearbyWreck,
} from "@/features/atlas/model/nearby";
import { buildAtlasUrl } from "@/features/atlas/model/atlas-url-state";
import { useAtlasStore } from "@/features/atlas/model/atlas-store-provider";

function formatCoordinates(coordinates: [number, number]): string {
  return `${Math.abs(coordinates[1]).toFixed(4)}° ${
    coordinates[1] >= 0 ? "N" : "S"
  } · ${Math.abs(coordinates[0]).toFixed(4)}° ${
    coordinates[0] >= 0 ? "E" : "W"
  }`;
}

type SheetMode = "peek" | "half" | "full";

function nextSheetMode(mode: SheetMode): SheetMode {
  if (mode === "peek") return "half";
  if (mode === "half") return "full";
  return "peek";
}

export function WreckDetailPanel() {
  const selected = useAtlasStore((state) => state.selectedWreckId);
  const setSelected = useAtlasStore((state) => state.setSelected);
  const compactWrecks = useAtlasStore((state) => state.compactWrecks);
  const era = useAtlasStore((state) => state.era);
  const recordKind = useAtlasStore((state) => state.recordKind);
  const depthBand = useAtlasStore((state) => state.depthBand);
  const resetFilters = useAtlasStore((state) => state.resetFilters);
  const [wreck, setWreck] = useState<Wreck | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("half");
  const [copyStatus, setCopyStatus] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const close = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const draggedSheet = useRef(false);
  const nearby = useMemo(
    () => wreck
      ? findNearbyWrecks(compactWrecks, wreck.id, wreck.coordinates)
      : null,
    [compactWrecks, wreck],
  );

  useEffect(() => {
    setWreck(null);
    setExpanded(false);
    setNearbyOpen(false);
    setSheetMode("half");
    setCopyStatus("");
    if (!selected) {
      setStatus("idle");
      return;
    }

    let current = true;
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/wrecks/${encodeURIComponent(selected)}`, {
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? wreckSchema.safeParse(await response.json()) : null))
      .then((parsed) => {
        if (!current) return;
        if (parsed?.success) {
          setWreck(parsed.data);
          setStatus("success");
          window.dispatchEvent(
            new CustomEvent("atlas:fly-to", {
              detail: { coordinates: parsed.data.coordinates },
            }),
          );
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

  const showCopied = (message: string) => {
    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
    }
    setCopyStatus(message);
    copyTimer.current = window.setTimeout(() => {
      setCopyStatus("");
      copyTimer.current = null;
    }, 1800);
  };

  useEffect(() => () => {
    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
    }
  }, []);

  const copyCoordinates = async () => {
    if (!wreck) return;

    try {
      await copyText(formatCoordinates(wreck.coordinates));
      showCopied("Coordinates copied");
    } catch {
      showCopied("Coordinates could not be copied");
    }
  };

  const copyLink = async () => {
    if (!wreck) return;

    const url = buildAtlasUrl(window.location.href, {
      selectedWreckId: wreck.id,
      era,
      recordKind,
      depthBand,
    });

    try {
      await copyText(url.toString());
      showCopied("Wreck link copied");
    } catch {
      showCopied("Link could not be copied");
    }
  };

  const chooseNearby = (item: NearbyWreck) => {
    resetFilters();
    setSelected(item.id);
    window.dispatchEvent(
      new CustomEvent("atlas:fly-to", {
        detail: { coordinates: item.coordinates },
      }),
    );
  };

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

  return (
    <aside
      className="detail-panel"
      data-sheet-state={sheetMode}
      aria-label={`${wreck.name} details`}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-label={
          sheetMode === "peek"
            ? "Expand details to half height"
            : sheetMode === "half"
              ? "Expand details to full height"
              : "Collapse details to peek"
        }
        aria-expanded={sheetMode !== "peek"}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          dragStartY.current = event.clientY;
          draggedSheet.current = false;
        }}
        onPointerUp={(event) => {
          if (dragStartY.current === null) return;

          const delta = event.clientY - dragStartY.current;
          dragStartY.current = null;
          if (Math.abs(delta) < 24) return;

          draggedSheet.current = true;
          setSheetMode((current) => {
            if (delta < 0) {
              return current === "peek" ? "half" : "full";
            }
            return current === "full" ? "half" : "peek";
          });
        }}
        onPointerCancel={() => {
          dragStartY.current = null;
          draggedSheet.current = false;
        }}
        onClick={() => {
          if (draggedSheet.current) {
            draggedSheet.current = false;
            return;
          }
          setSheetMode(nextSheetMode);
        }}
      >
        <span aria-hidden="true" />
        <b>{sheetMode}</b>
      </button>
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
        <span>UKHO record</span>
      </div>
      <h1>{wreck.name}</h1>
      <p className="record-type">
        {wreck.category}
        {wreck.type.toLowerCase() !== wreck.category.toLowerCase()
          ? ` · ${wreck.type}`
          : ""}
      </p>
      <div className="facts">
        <span><MapPin size={15} /> {wreck.sunkYear ?? "Year unknown"}</span>
        <span><Waves size={15} /> {wreck.depthM !== null ? `${wreck.depthM.toLocaleString()} m` : "Depth unknown"}</span>
      </div>
      <p className="story">{wreck.story}</p>
      <div className="panel-actions">
        <button type="button" onClick={copyLink}>
          <Link2 size={14} />
          Copy link
        </button>
        <button type="button" onClick={copyCoordinates}>
          <Copy size={14} />
          Copy position
        </button>
      </div>
      <p className="copy-status" aria-live="polite">{copyStatus}</p>
      {nearby && nearby.totalWithinRadius > 0 && (
        <div className="nearby-signals">
          <button
            type="button"
            className="nearby-toggle"
            onClick={() => {
              const nextOpen = !nearbyOpen;
              setNearbyOpen(nextOpen);
              if (nextOpen) setSheetMode("full");
            }}
            aria-expanded={nearbyOpen}
          >
            <RadioTower size={15} />
            <span>
              Nearby signals
              <small>
                {nearby.totalWithinRadius.toLocaleString()} within{" "}
                {nearby.radiusKm} km
              </small>
            </span>
            <ChevronDown size={15} />
          </button>
          {nearbyOpen && (
            <ol className="nearby-list">
              {nearby.items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => chooseNearby(item)}>
                    <span>{item.name}</span>
                    <small>
                      {item.distanceKm < 1
                        ? `${Math.round(item.distanceKm * 1000)} m`
                        : `${item.distanceKm.toFixed(1)} km`}
                      {" · "}
                      approximate map distance
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <button
        className="expand-button"
        onClick={() => {
          const nextExpanded = !expanded;
          setExpanded(nextExpanded);
          if (nextExpanded) setSheetMode("full");
        }}
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
            <dt>Source release</dt>
            <dd>{wreck.sourceRelease}</dd>
            <dt>Record ID</dt>
            <dd>{wreck.sourceId}</dd>
            {wreck.status && (
              <>
                <dt>Source status</dt>
                <dd>{wreck.status}</dd>
              </>
            )}
            {wreck.depthQuality && (
              <>
                <dt>Recorded depth quality</dt>
                <dd>{wreck.depthQuality}</dd>
              </>
            )}
            {wreck.positionMethod && (
              <>
                <dt>Position method</dt>
                <dd>{wreck.positionMethod}</dd>
              </>
            )}
            {wreck.sourceUpdatedOn && (
              <>
                <dt>Source record amended</dt>
                <dd>{wreck.sourceUpdatedOn}</dd>
              </>
            )}
            <dt>Licence</dt>
            <dd>{wreck.licence}</dd>
          </dl>
        </div>
      )}
      <div className="coordinates">
        <span>RECORDED POSITION · MAY BE APPROXIMATE</span>
        <code>{formatCoordinates(wreck.coordinates)}</code>
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
