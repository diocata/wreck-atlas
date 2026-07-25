"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle, RotateCw } from "lucide-react";
import type { WreckDataSource } from "@/lib/domain/wreck";
import { useAtlasStore } from "@/stores/atlas-store-provider";

type Collection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    id: string;
    name: string;
    category: string;
    sunkYear: number | null;
    depthM: number | null;
  }
>;

const empty: Collection = { type: "FeatureCollection", features: [] };
const noSelectionFilter: maplibregl.FilterSpecification = ["==", ["get", "id"], ""];

function tileUrl(era: string, retry?: number) {
  const suffix = retry ? `&retry=${retry}` : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return `${origin}/api/wrecks/tiles/{z}/{x}/{y}?era=${encodeURIComponent(era)}${suffix}`;
}

/* ─── Sleek Arcade Sonar naval vessel marker ─── */
function createShipSprite(
  size: number,
  fill: string,
  stroke: string,
  strokeW: number,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const s = size;
  const cx = s / 2;

  ctx.clearRect(0, 0, s, s);

  /* Soft outer radar ring */
  ctx.strokeStyle = fill;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  ctx.arc(cx, cx, s * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  /* Sleek aerodynamic naval hull silhouette */
  ctx.beginPath();
  ctx.moveTo(cx, s * 0.08);                         // needle bow
  ctx.bezierCurveTo(cx + s * 0.18, s * 0.22, cx + s * 0.22, s * 0.40, cx + s * 0.22, s * 0.65); // starboard beam
  ctx.lineTo(cx + s * 0.16, s * 0.88);              // starboard stern
  ctx.lineTo(cx - s * 0.16, s * 0.88);              // transom stern
  ctx.lineTo(cx - s * 0.22, s * 0.65);              // port stern
  ctx.bezierCurveTo(cx - s * 0.22, s * 0.40, cx - s * 0.18, s * 0.22, cx, s * 0.08); // port beam to bow
  ctx.closePath();

  /* Fill hull */
  ctx.fillStyle = fill;
  ctx.fill();

  /* Stroke hull */
  if (strokeW > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  /* Stepped bridge superstructure deck */
  const bridgeW = s * 0.24;
  const bridgeH = s * 0.28;
  const bridgeX = cx - bridgeW / 2;
  const bridgeY = s * 0.48;

  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.roundRect(bridgeX, bridgeY, bridgeW, bridgeH, s * 0.03);
  ctx.fill();

  /* Glowing sonar core dot on the bridge */
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, s * 0.60, s * 0.06, 0, Math.PI * 2);
  ctx.fill();

  /* Forward deck hatch line */
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, s * 0.32);
  ctx.lineTo(cx + s * 0.08, s * 0.32);
  ctx.stroke();

  return ctx.getImageData(0, 0, s, s);
}

export function AtlasMap({ dataSource }: { dataSource: WreckDataSource }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const sourceReady = useRef(false);
  const latestData = useRef<Collection>(empty);
  const latestEra = useRef("all");
  const [data, setData] = useState<Collection>(empty);
  const [error, setError] = useState(false);
  const era = useAtlasStore((state) => state.era);
  const selected = useAtlasStore((state) => state.selectedWreckId);
  const selectedRef = useRef(selected);
  const setEra = useAtlasStore((state) => state.setEra);
  const setSelected = useAtlasStore((state) => state.setSelected);

  const applyData = useCallback((next: Collection) => {
    latestData.current = next;
    const source = map.current?.getSource("wrecks") as maplibregl.GeoJSONSource | undefined;
    if (sourceReady.current && source) source.setData(next);
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (dataSource !== "demo") return;

      setError(false);
      try {
        const response = await fetch(`/api/wrecks?era=${era}`, { signal });
        if (!response.ok) throw new Error("data unavailable");
        const next = (await response.json()) as Collection;
        if (signal?.aborted) return;
        setData(next);
        applyData(next);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setData(empty);
        applyData(empty);
        setError(true);
      }
    },
    [applyData, dataSource, era],
  );

  useEffect(() => {
    latestEra.current = era;

    if (dataSource === "supabase") {
      setError(false);
      const source = map.current?.getSource("wrecks") as
        | maplibregl.VectorTileSource
        | undefined;

      if (sourceReady.current && source) {
        source.setTiles([tileUrl(era)]);
      }

      return;
    }

    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [dataSource, era, load]);

  useEffect(() => {
    selectedRef.current = selected;
    const instance = map.current;
    if (!instance?.getLayer("wreck-selected")) return;
    instance.setFilter(
      "wreck-selected",
      selected ? ["==", ["get", "id"], selected] : noSelectionFilter,
    );
  }, [selected]);

  useEffect(() => {
    if (!container.current || map.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const instance = new maplibregl.Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [4, 25],
      zoom: 1.5,
    });

    map.current = instance;
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const setupLayers = () => {
      if (instance.getSource("wrecks")) return;

      /* Register ship sprite images at pixel-ratio 2 for retina */
      const spriteSize = 64;
      const ratio = 2;

      instance.addImage(
        "ship-default",
        createShipSprite(spriteSize, "#ffe14d", "#a08520", 1.5),
        { pixelRatio: ratio },
      );
      instance.addImage(
        "ship-selected",
        createShipSprite(spriteSize, "#ffffff", "#ffe14d", 2),
        { pixelRatio: ratio },
      );

      if (dataSource === "supabase") {
        instance.addSource("wrecks", {
          type: "vector",
          tiles: [tileUrl(latestEra.current)],
          minzoom: 0,
          maxzoom: 14,
        });
      } else {
        instance.addSource("wrecks", {
          type: "geojson",
          data: latestData.current,
          cluster: false,
        });
      }

      sourceReady.current = true;

      const sourceLayer = dataSource === "supabase"
        ? { "source-layer": "wrecks" }
        : {};

      /* ─── Sonar glow pulse behind each wreck ─── */
      instance.addLayer({
        id: "wreck-glow",
        type: "circle",
        source: "wrecks",
        ...sourceLayer,
        paint: {
          "circle-color": "#ffe14d",
          "circle-radius": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            0, 14,
            4, 18,
            8, 26,
            12, 34,
          ],
          "circle-opacity": [
            "interpolate", ["linear"], ["zoom"],
            0, 0.12,
            4, 0.15,
            8, 0.20,
            12, 0.25,
          ],
          "circle-blur": 0.8,
        },
      });

      /* ─── Ship icon layer ─── */
      instance.addLayer({
        id: "wreck-ships",
        type: "symbol",
        source: "wrecks",
        ...sourceLayer,
        layout: {
          "icon-image": "ship-default",
          "icon-size": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            0, 0.50,
            4, 0.65,
            7, 0.85,
            10, 1.05,
            13, 1.30,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "map",
        },
        paint: {
          "icon-opacity": [
            "interpolate", ["linear"], ["zoom"],
            0, 0.65,
            4, 0.75,
            7, 0.88,
            10, 1,
          ],
        },
      });

      /* ─── Selected wreck highlight ring ─── */
      instance.addLayer({
        id: "wreck-selected",
        type: "circle",
        source: "wrecks",
        ...sourceLayer,
        filter: selectedRef.current
          ? ["==", ["get", "id"], selectedRef.current]
          : noSelectionFilter,
        paint: {
          "circle-radius": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            0, 16,
            7, 24,
            10, 32,
          ],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#ffe14d",
          "circle-stroke-width": [
            "interpolate", ["linear"], ["zoom"],
            0, 2,
            7, 3,
            10, 4,
          ],
        },
      });

      /* ─── Selected wreck icon override (yellow ship) ─── */
      instance.addLayer({
        id: "wreck-selected-icon",
        type: "symbol",
        source: "wrecks",
        ...sourceLayer,
        filter: selectedRef.current
          ? ["==", ["get", "id"], selectedRef.current]
          : noSelectionFilter,
        layout: {
          "icon-image": "ship-selected",
          "icon-size": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            0, 0.85,
            7, 1.4,
            10, 1.8,
            13, 2.2,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: {
          "icon-opacity": 1,
        },
      });

      /* ─── Wreck name labels (high zoom only) ─── */
      instance.addLayer({
        id: "wreck-labels",
        type: "symbol",
        source: "wrecks",
        ...sourceLayer,
        minzoom: 10,
        layout: {
          "text-field": ["coalesce", ["get", "name"], ""],
          "text-font": ["Noto Sans Bold"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            10, 9,
            14, 12,
          ],
          "text-offset": [0, 2.0],
          "text-anchor": "top",
          "text-max-width": 12,
          "text-optional": true,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1a3a42",
          "text-halo-color": "rgba(255, 255, 255, 0.85)",
          "text-halo-width": 1.5,
          "text-opacity": [
            "interpolate", ["linear"], ["zoom"],
            10, 0.7,
            12, 1,
          ],
        },
      });

      /* ─── Click handler — robust symbol hit testing across all wreck layers ─── */
      instance.on("click", (event) => {
        const pad = 16;
        const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [event.point.x - pad, event.point.y - pad],
          [event.point.x + pad, event.point.y + pad],
        ];
        const features = instance.queryRenderedFeatures(bbox);
        if (!features.length) return;

        const hit = features.find(
          (f) => f.layer?.source === "wrecks" && (f.properties?.id !== undefined || f.id !== undefined),
        );
        if (!hit) return;

        const rawId = hit.properties?.id ?? hit.id;
        if (rawId === undefined || rawId === null || rawId === "") return;

        const id = rawId.toString();
        setSelected(id);

        const geom = hit.geometry;
        if (geom && geom.type === "Point") {
          instance.easeTo({
            center: geom.coordinates as [number, number],
            zoom: Math.max(instance.getZoom(), 8),
            duration: reduceMotion ? 0 : 420,
          });
        }
      });

      instance.on("mouseenter", "wreck-ships", () => {
        instance.getCanvas().style.cursor = "crosshair";
      });
      instance.on("mouseleave", "wreck-ships", () => {
        instance.getCanvas().style.cursor = "";
      });
    };

    if (instance.isStyleLoaded()) {
      setupLayers();
    } else {
      instance.on("style.load", setupLayers);
    }

    /* ─── Update selected icon layer when selection changes ─── */
    const onSelectionChange = () => {
      const sel = selectedRef.current;
      const selFilter: maplibregl.FilterSpecification = sel
        ? ["==", ["get", "id"], sel]
        : noSelectionFilter;

      if (instance.getLayer("wreck-selected-icon")) {
        instance.setFilter("wreck-selected-icon", selFilter);
      }
    };

    instance.on("data", () => onSelectionChange());

    instance.on("error", (event) => {
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;

      if (dataSource === "supabase" && sourceId === "wrecks") {
        setError(true);
      }
    });

    instance.on("data", (event) => {
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;

      if (
        dataSource === "supabase"
        && sourceId === "wrecks"
        && instance.isSourceLoaded("wrecks")
      ) {
        setError(false);
      }
    });

    const fly = (event: Event) => {
      const coordinates = (event as CustomEvent<{ coordinates: [number, number] }>).detail.coordinates;
      instance.flyTo({
        center: coordinates,
        zoom: Math.max(instance.getZoom(), dataSource === "supabase" ? 9 : 5),
        duration: reduceMotion ? 0 : 850,
        essential: !reduceMotion,
      });
    };

    window.addEventListener("atlas:fly-to", fly);
    return () => {
      window.removeEventListener("atlas:fly-to", fly);
      sourceReady.current = false;
      instance.remove();
      map.current = null;
    };
  }, [dataSource, setSelected]);

  /* Keep selected-icon filter in sync */
  useEffect(() => {
    selectedRef.current = selected;
    const instance = map.current;
    if (!instance) return;

    const selFilter: maplibregl.FilterSpecification = selected
      ? ["==", ["get", "id"], selected]
      : noSelectionFilter;

    if (instance.getLayer("wreck-selected")) {
      instance.setFilter("wreck-selected", selFilter);
    }
    if (instance.getLayer("wreck-selected-icon")) {
      instance.setFilter("wreck-selected-icon", selFilter);
    }
  }, [selected]);

  const retry = () => {
    if (dataSource === "demo") {
      void load();
      return;
    }

    setError(false);
    const source = map.current?.getSource("wrecks") as
      | maplibregl.VectorTileSource
      | undefined;
    source?.setTiles([tileUrl(era, Date.now())]);
  };

  return (
    <>
      <div
        ref={container}
        className="map"
        role="region"
        aria-label="Interactive map showing documented shipwreck records"
      />
      {error && (
        <div className="map-error" role="status">
          <AlertTriangle size={16} />
          <span>Wreck records are unavailable. The chart is still usable.</span>
          <button onClick={retry}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}
      {dataSource === "demo" && !error && data.features.length === 0 && (
        <div className="map-error" role="status">
          No wreck signals match this era.
          <button onClick={() => setEra("all")}>Clear filter</button>
        </div>
      )}
    </>
  );
}
