"use client";

import { useEffect, useRef, useState } from "react";
import {
  Anchor,
  Radar,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { wreckSearchResultSchema, type WreckSearchResult } from "@/domain/wreck";
import { chooseDiscoveryWreck } from "@/features/atlas/model/discovery";
import { useAtlasStore } from "@/features/atlas/model/atlas-store-provider";
import { eraOptions } from "@/features/atlas/model/era";
import {
  countActiveFilters,
  depthBandOptions,
  recordKindOptions,
} from "@/features/atlas/model/filters";
import { searchCompactWrecks } from "@/features/atlas/model/search";
import { HighlightedText } from "./highlighted-text";

export function AtlasToolbar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WreckSearchResult[]>([]);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const era = useAtlasStore((state) => state.era);
  const setEra = useAtlasStore((state) => state.setEra);
  const recordKind = useAtlasStore((state) => state.recordKind);
  const setRecordKind = useAtlasStore((state) => state.setRecordKind);
  const depthBand = useAtlasStore((state) => state.depthBand);
  const setDepthBand = useAtlasStore((state) => state.setDepthBand);
  const resetFilters = useAtlasStore((state) => state.resetFilters);
  const selectedWreckId = useAtlasStore((state) => state.selectedWreckId);
  const setSelected = useAtlasStore((state) => state.setSelected);
  const openAtlasGuide = useAtlasStore((state) => state.openAtlasGuide);
  const open = useAtlasStore((state) => state.filterPanelOpen);
  const setOpen = useAtlasStore((state) => state.setFilterPanelOpen);
  const compactWrecks = useAtlasStore((state) => state.compactWrecks);
  const activeFilterCount = countActiveFilters({ era, recordKind, depthBand });
  const popupOpen = open || results.length > 0;
  const activeResultId = results[active]?.id;

  useEffect(() => {
    const controller = new AbortController();
    const term = query.trim().toLowerCase();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    if (compactWrecks.length > 0) {
      setResults(searchCompactWrecks(compactWrecks, query));
      setActive(-1);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const parsed = response.ok
          ? wreckSearchResultSchema.array().safeParse(await response.json())
          : null;
        setResults(parsed?.success ? parsed.data : []);
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


  const choose = (result: WreckSearchResult) => {
    resetFilters();
    setSelected(result.id);
    setQuery("");
    setResults([]);
    window.dispatchEvent(
      new CustomEvent("atlas:fly-to", { detail: { coordinates: result.coordinates } }),
    );
  };

  const discover = () => {
    const result = chooseDiscoveryWreck(compactWrecks, selectedWreckId);
    if (!result) return;

    resetFilters();
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(result.id);
    window.dispatchEvent(
      new CustomEvent("atlas:fly-to", {
        detail: { coordinates: result.coordinates },
      }),
    );
  };

  return (
    <header className={`toolbar${popupOpen ? " toolbar-popup-open" : ""}`}>
      <button
        type="button"
        className="brand"
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          openAtlasGuide("about");
        }}
        aria-label="Open Atlas Guide"
      >
        <span className="brand-mark"><Anchor aria-hidden="true" size={16} /></span>
        <span>WRECK ATLAS</span>
      </button>

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
          aria-activedescendant={
            activeResultId ? `wreck-result-${activeResultId}` : undefined
          }
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
              <li key={result.id}>
                <button
                  id={`wreck-result-${result.id}`}
                  className={index === active ? "active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(result)}
                  role="option"
                  aria-selected={index === active}
                >
                  <span>
                    <HighlightedText text={result.name} query={query} />
                  </span>
                  <small>
                    <b>Name match</b>
                    {" · "}
                    {result.sunkYear ?? "Year unknown"} · {result.type}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="discover-button"
        onClick={discover}
        disabled={compactWrecks.length === 0}
        aria-label="Discover a wreck"
        title={
          compactWrecks.length > 0
            ? "Discover a documented wreck"
            : "Wreck signals are still loading"
        }
      >
        <Radar size={15} />
        <span>Discover</span>
      </button>

      <div className="filter-wrap">
        <button
          className="filter-button arcade-era-btn"
          onClick={() => setOpen(!open)}
          aria-label={
            activeFilterCount === 0
              ? "Filter wreck records. No filters active"
              : `Filter wreck records. ${activeFilterCount} active`
          }
          aria-expanded={open}
          aria-controls="atlas-filter"
        >
          <SlidersHorizontal size={15} />
          <span className="era-hud-text">
            <span className="era-hud-prefix">FILTERS //</span>
            <b>
              {activeFilterCount === 0
                ? "ALL RECORDS"
                : `${activeFilterCount} ACTIVE`}
            </b>
          </span>
          {activeFilterCount > 0 && (
            <b className="era-active-dot" aria-label="Filters active" />
          )}
        </button>
        {open && (
          <div
            id="atlas-filter"
            className="filter-popover arcade-popover"
            role="dialog"
            aria-label="Filter wreck records"
          >
            <div className="arcade-popover-header">
              <span>► TUNE WRECK SIGNALS</span>
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
              >
                Clear all
              </button>
            </div>
            <fieldset className="filter-group">
              <legend>Era</legend>
              <div className="filter-option-grid filter-option-grid-era">
                {eraOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={era === option.value ? "selected" : ""}
                    onClick={() => setEra(option.value)}
                    aria-pressed={era === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="filter-group">
              <legend>Record type</legend>
              <div className="filter-option-grid filter-option-grid-kind">
                {recordKindOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={recordKind === option.value ? "selected" : ""}
                    onClick={() => setRecordKind(option.value)}
                    aria-pressed={recordKind === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="filter-group">
              <legend>Recorded depth</legend>
              <div className="filter-option-grid filter-option-grid-depth">
                {depthBandOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={depthBand === option.value ? "selected" : ""}
                    onClick={() => setDepthBand(option.value)}
                    aria-pressed={depthBand === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p>Source measurements may be approximate. Not for navigation.</p>
            </fieldset>
          </div>
        )}
      </div>
    </header>
  );
}
