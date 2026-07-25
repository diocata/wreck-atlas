"use client";

import { useEffect, useRef, useState } from "react";
import { Anchor, Search, SlidersHorizontal, X } from "lucide-react";
import { useAtlasStore } from "@/stores/atlas-store-provider";
import type { Era } from "@/stores/atlas-store";

type Result = {
  id: string;
  name: string;
  coordinates: [number, number];
  sunkYear: number | null;
  type: string;
};

const eras: { value: Era; label: string; compact: string }[] = [
  { value: "all", label: "All eras", compact: "All eras" },
  { value: "before-1900", label: "Before 1900", compact: "< 1900" },
  { value: "1900-1945", label: "1900–1945", compact: "1900–45" },
  { value: "after-1945", label: "After 1945", compact: "> 1945" },
];

export function AtlasToolbar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const era = useAtlasStore((state) => state.era);
  const setEra = useAtlasStore((state) => state.setEra);
  const selected = useAtlasStore((state) => state.setSelected);
  const open = useAtlasStore((state) => state.filterPanelOpen);
  const setOpen = useAtlasStore((state) => state.setFilterPanelOpen);
  const compactWrecks = useAtlasStore((state) => state.compactWrecks);
  const currentEra = eras.find((option) => option.value === era) ?? eras[0];

  useEffect(() => {
    const controller = new AbortController();
    const term = query.trim().toLowerCase();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    if (compactWrecks.length > 0) {
      const matches: Result[] = [];
      for (let i = 0; i < compactWrecks.length; i++) {
        const w = compactWrecks[i];
        if (w.name && w.name.toLowerCase().includes(term)) {
          matches.push({
            id: w.id,
            name: w.name,
            coordinates: w.coordinates,
            sunkYear: w.sunkYear,
            type: w.type,
          });
          if (matches.length >= 8) break;
        }
      }
      setResults(matches);
      setActive(-1);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        setResults(response.ok ? await response.json() : []);
        setActive(-1);
      } catch {
        // Search is optional; the map remains usable if it is unavailable.
      }
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, compactWrecks]);


  const choose = (result: Result) => {
    setEra("all");
    selected(result.id);
    setQuery("");
    setResults([]);
    window.dispatchEvent(
      new CustomEvent("atlas:fly-to", { detail: { coordinates: result.coordinates } }),
    );
  };

  return (
    <header className={`toolbar${open ? " toolbar-filter-open" : ""}`}>
      <div className="brand" aria-label="Wreck Atlas">
        <span className="brand-mark"><Anchor aria-hidden="true" size={16} /></span>
        <span>WRECK ATLAS</span>
      </div>

      <div className="search-wrap">
        <Search aria-hidden="true" size={17} />
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && results[active]) choose(results[active]);
            if (event.key === "Escape") {
              setResults([]);
              input.current?.blur();
            }
          }}
          placeholder="Find a wreck…"
          aria-label="Search wrecks"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="wreck-results"
          aria-activedescendant={active >= 0 ? `wreck-result-${results[active]?.id}` : undefined}
        />
        {query && (
          <button
            className="clear-search"
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
        {results.length > 0 && (
          <ul id="wreck-results" className="search-results" role="listbox">
            {results.map((result, index) => (
              <li key={result.id} id={`wreck-result-${result.id}`}>
                <button
                  className={index === active ? "active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(result)}
                  role="option"
                  aria-selected={index === active}
                >
                  <span>{result.name}</span>
                  <small>{result.sunkYear ?? "Year unknown"} · {result.type}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="filter-wrap">
        <button
          className="filter-button arcade-era-btn"
          onClick={() => setOpen(!open)}
          aria-label={`Filter by era. Current selection: ${currentEra.label}`}
          aria-expanded={open}
          aria-controls="era-filter"
        >
          <SlidersHorizontal size={15} />
          <span className="era-hud-text">
            <span className="era-hud-prefix">ERA //</span>
            <b>{currentEra.compact.toUpperCase()}</b>
          </span>
          {era !== "all" && <b className="era-active-dot" aria-label="Era filter active" />}
        </button>
        {open && (
          <div id="era-filter" className="filter-popover arcade-popover" role="dialog" aria-label="Filter by era">
            <div className="arcade-popover-header">
              <span>► SELECT TIMELINE STAGE</span>
            </div>
            <div className="arcade-popover-list">
              {eras.map((option, idx) => (
                <button
                  key={option.value}
                  className={`arcade-stage-btn ${era === option.value ? "selected" : ""}`}
                  onClick={() => {
                    setEra(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="stage-num">0{idx + 1}</span>
                  <span className="stage-name">{option.label}</span>
                  {era === option.value && <span className="stage-active">◄</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
