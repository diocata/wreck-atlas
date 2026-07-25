"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle, RotateCw } from "lucide-react";
import type { WreckCompactItem } from "@/lib/domain/wreck";
import { useAtlasStore } from "@/stores/atlas-store-provider";
import { loadCachedWrecks } from "@/lib/cache/wreck-cache";

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

function toFeatureCollection(items: WreckCompactItem[]): Collection {
  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: item.coordinates },
      properties: {
        id: item.id,
        name: item.name,
        category: item.category,
        sunkYear: item.sunkYear,
        depthM: item.depthM,
      },
    })),
  };
}
class ResetViewControl implements maplibregl.IControl {
  private container!: HTMLDivElement;
  private button!: HTMLButtonElement;
  private map?: maplibregl.Map;
  private onReset?: () => void;

  constructor(onReset?: () => void) {
    this.onReset = onReset;
  }

  onAdd(map: maplibregl.Map) {
    this.map = map;
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group reset-view-ctrl";
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.title = "Reset view to default";
    this.button.setAttribute("aria-label", "Reset view to default");
    this.button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
    this.button.onclick = () => {
      this.onReset?.();
      this.map?.flyTo({
        center: [4, 25],
        zoom: 1.5,
        pitch: 0,
        bearing: 0,
        duration: 850,
      });
    };
    this.container.appendChild(this.button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode?.removeChild(this.container);
    this.map = undefined;
  }
}


export function AtlasMap() {
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
  const compactWrecks = useAtlasStore((state) => state.compactWrecks);
  const setCompactWrecks = useAtlasStore((state) => state.setCompactWrecks);
  const setIsCacheLoading = useAtlasStore((state) => state.setIsCacheLoading);
  const isCacheLoading = useAtlasStore((state) => state.isCacheLoading);

  const applyData = useCallback((next: Collection) => {
    latestData.current = next;
    const source = map.current?.getSource("wrecks") as maplibregl.GeoJSONSource | undefined;
    if (sourceReady.current && source) source.setData(next);
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(false);
      try {
        let currentWrecks = compactWrecks;
        if (currentWrecks.length === 0) {
          setIsCacheLoading(true);
          const { wrecks, etag } = await loadCachedWrecks("all");
          if (signal?.aborted) return;
          currentWrecks = wrecks;
          setCompactWrecks(wrecks, etag);
        }

        const filtered = currentWrecks.filter((w) => {
          if (!era || era === "all") return true;
          if (!w.sunkYear) return false;
          if (era === "before-1900") return w.sunkYear < 1900;
          if (era === "1900-1945") return w.sunkYear >= 1900 && w.sunkYear <= 1945;
          return w.sunkYear > 1945;
        });

        const next = toFeatureCollection(filtered);
        setData(next);
        applyData(next);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setData(empty);
        applyData(empty);
        setError(true);
      } finally {
        setIsCacheLoading(false);
      }
    },
    [applyData, compactWrecks, era, setCompactWrecks, setIsCacheLoading],
  );

  useEffect(() => {
    latestEra.current = era;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [era, load]);


  useEffect(() => {
    if (!container.current || map.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const instance = new maplibregl.Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [4, 25],
      zoom: 1.5,
      attributionControl: false,
    });

    map.current = instance;
    instance.addControl(
      new ResetViewControl(() => {
        setSelected(null);
      }),
      "bottom-right",
    );
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const setupLayers = () => {
      if (instance.getSource("wrecks")) return;

      /* Register transparent PNG ship logos at pixel-ratio 2 for retina */
      const ratio = 2;
      instance.loadImage("/ship.png").then((response) => {
        if (!response || !response.data) return;
        if (!instance.hasImage("ship-default")) {
          instance.addImage("ship-default", response.data, { pixelRatio: ratio });
        }
        if (!instance.hasImage("ship-selected")) {
          instance.addImage("ship-selected", response.data, { pixelRatio: ratio });
        }
      }).catch(() => {});

      instance.addSource("wrecks", {
        type: "geojson",
        data: latestData.current,
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      sourceReady.current = true;

      /* ─── Cluster cyan glow ─── */
      instance.addLayer({
        id: "wreck-clusters-glow",
        type: "circle",
        source: "wrecks",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#00f0ff",
          "circle-radius": [
            "step", ["get", "point_count"],
            24, 100,
            32, 1000,
            40,
          ],
          "circle-opacity": 0.25,
          "circle-blur": 0.8,
        },
      });

      /* ─── Cluster dark sonar center with yellow border ─── */
      instance.addLayer({
        id: "wreck-clusters",
        type: "circle",
        source: "wrecks",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0a1418",
          "circle-radius": [
            "step", ["get", "point_count"],
            16, 100,
            20, 1000,
            26,
          ],
          "circle-stroke-color": "#ffe14d",
          "circle-stroke-width": 2,
        },
      });

      /* ─── Cluster count label ─── */
      instance.addLayer({
        id: "wreck-cluster-count",
        type: "symbol",
        source: "wrecks",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffe14d",
        },
      });

      /* ─── Sonar glow pulse behind each wreck ─── */
      instance.addLayer({
        id: "wreck-glow",
        type: "circle",
        source: "wrecks",
        filter: ["!has", "point_count"],
        minzoom: 6,
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
        filter: ["!has", "point_count"],
        layout: {
          "icon-image": "ship-default",
          "icon-size": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            0, 0.07,
            4, 0.09,
            7, 0.12,
            10, 0.15,
            13, 0.19,
          ],
          "icon-allow-overlap": ["step", ["zoom"], false, 6, true],
          "icon-ignore-placement": ["step", ["zoom"], false, 6, true],
          "icon-padding": 2,
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "map",
        },
        paint: {
          "icon-opacity": 1,
        },
      });

      /* ─── Selected wreck highlight ring ─── */
      instance.addLayer({
        id: "wreck-selected",
        type: "circle",
        source: "wrecks",
        filter: selectedRef.current
          ? ["==", ["to-string", ["get", "id"]], String(selectedRef.current)]
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
        filter: selectedRef.current
          ? ["==", ["to-string", ["get", "id"]], String(selectedRef.current)]
          : noSelectionFilter,
        layout: {
          "icon-image": "ship-selected",
          "icon-size": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            0, 0.12,
            7, 0.18,
            10, 0.22,
            13, 0.28,
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
          "text-opacity": 1,
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

        const hitCluster = features.find(
          (f) => f.layer?.source === "wrecks" && (f.properties?.cluster || f.properties?.point_count),
        );
        if (hitCluster && hitCluster.geometry.type === "Point") {
          const source = instance.getSource("wrecks") as maplibregl.GeoJSONSource | undefined;
          const clusterId = hitCluster.properties?.cluster_id;
          if (source && clusterId !== undefined) {
            source.getClusterExpansionZoom(clusterId).then((zoom) => {
              instance.easeTo({
                center: (hitCluster.geometry as GeoJSON.Point).coordinates as [number, number],
                zoom: zoom + 0.5,
                duration: reduceMotion ? 0 : 420,
              });
            }).catch(() => {});
          } else {
            instance.easeTo({
              center: (hitCluster.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: instance.getZoom() + 2,
              duration: reduceMotion ? 0 : 420,
            });
          }
          return;
        }

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

      const interactiveLayers = ["wreck-ships", "wreck-clusters"];
      interactiveLayers.forEach((layer) => {
        instance.on("mouseenter", layer, () => {
          instance.getCanvas().style.cursor = "pointer";
        });
        instance.on("mouseleave", layer, () => {
          instance.getCanvas().style.cursor = "";
        });
      });
    };

    if (instance.isStyleLoaded()) {
      setupLayers();
    } else {
      instance.on("style.load", setupLayers);
    }

    instance.on("error", (event) => {
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;

      if (sourceId === "wrecks") {
        setError(true);
      }
    });

    instance.on("data", (event) => {
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;

      if (
        sourceId === "wrecks"
        && instance.isSourceLoaded("wrecks")
      ) {
        setError(false);
      }
    });

    const fly = (event: Event) => {
      const coordinates = (event as CustomEvent<{ coordinates: [number, number] }>).detail.coordinates;
      instance.flyTo({
        center: coordinates,
        zoom: Math.max(instance.getZoom(), 12),
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
  }, [setSelected]);

  /* Keep selected-icon filter in sync */
  useEffect(() => {
    selectedRef.current = selected;
    const instance = map.current;
    if (!instance) return;

    const selFilter: maplibregl.FilterSpecification = selected
      ? ["==", ["to-string", ["get", "id"]], String(selected)]
      : noSelectionFilter;

    if (instance.getLayer("wreck-selected")) {
      instance.setFilter("wreck-selected", selFilter);
    }
    if (instance.getLayer("wreck-selected-icon")) {
      instance.setFilter("wreck-selected-icon", selFilter);
    }
  }, [selected]);

  const retry = () => {
    void load();
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
      {!error && data.features.length === 0 && !isCacheLoading && (
        <div className="map-error" role="status">
          No wreck signals match this era.
          <button onClick={() => setEra("all")}>Clear filter</button>
        </div>
      )}
    </>
  );
}
