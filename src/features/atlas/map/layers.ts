import * as maplibregl from "maplibre-gl";
import type { WreckFeatureCollection } from "./geojson";

export const noSelectionFilter: maplibregl.FilterSpecification = [
  "==",
  ["get", "id"],
  "",
];

export function selectionFilter(
  id: string | null,
): maplibregl.FilterSpecification {
  return id
    ? ["==", ["to-string", ["get", "id"]], id]
    : noSelectionFilter;
}

function createWreckLayers(
  selectedId: string | null,
): maplibregl.LayerSpecification[] {
  return [
    {
      id: "wreck-clusters-glow",
      type: "circle",
      source: "wrecks",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#00f0ff",
        "circle-radius": [
          "step",
          ["get", "point_count"],
          24,
          100,
          32,
          1000,
          40,
        ],
        "circle-opacity": 0.25,
        "circle-blur": 0.8,
      },
    },
    {
      id: "wreck-clusters",
      type: "circle",
      source: "wrecks",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#0a1418",
        "circle-radius": [
          "step",
          ["get", "point_count"],
          16,
          100,
          20,
          1000,
          26,
        ],
        "circle-stroke-color": "#ffe14d",
        "circle-stroke-width": 2,
      },
    },
    {
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
    },
    {
      id: "wreck-glow",
      type: "circle",
      source: "wrecks",
      filter: ["!has", "point_count"],
      minzoom: 6,
      paint: {
        "circle-color": "#ffe14d",
        "circle-radius": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          0,
          14,
          4,
          18,
          8,
          26,
          12,
          34,
        ],
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          0.12,
          4,
          0.15,
          8,
          0.20,
          12,
          0.25,
        ],
        "circle-blur": 0.8,
      },
    },
    {
      id: "wreck-ships",
      type: "symbol",
      source: "wrecks",
      filter: ["!has", "point_count"],
      layout: {
        "icon-image": "ship-default",
        "icon-size": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          0,
          0.07,
          4,
          0.09,
          7,
          0.12,
          10,
          0.15,
          13,
          0.19,
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
    },
    {
      id: "wreck-selected",
      type: "circle",
      source: "wrecks",
      filter: selectionFilter(selectedId),
      paint: {
        "circle-radius": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          0,
          16,
          7,
          24,
          10,
          32,
        ],
        "circle-color": "rgba(0,0,0,0)",
        "circle-stroke-color": "#ffe14d",
        "circle-stroke-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          2,
          7,
          3,
          10,
          4,
        ],
      },
    },
    {
      id: "wreck-selected-icon",
      type: "symbol",
      source: "wrecks",
      filter: selectionFilter(selectedId),
      layout: {
        "icon-image": "ship-selected",
        "icon-size": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          0,
          0.12,
          7,
          0.18,
          10,
          0.22,
          13,
          0.28,
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 1,
      },
    },
    {
      id: "wreck-labels",
      type: "symbol",
      source: "wrecks",
      minzoom: 10,
      layout: {
        "text-field": ["coalesce", ["get", "name"], ""],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12],
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
    },
  ];
}

export function registerWreckLayers(
  map: maplibregl.Map,
  data: WreckFeatureCollection,
  selectedId: string | null,
) {
  if (map.getSource("wrecks")) return;

  void map
    .loadImage("/ship.png")
    .then((response) => {
      if (!response?.data) return;
      if (!map.hasImage("ship-default")) {
        map.addImage("ship-default", response.data, { pixelRatio: 2 });
      }
      if (!map.hasImage("ship-selected")) {
        map.addImage("ship-selected", response.data, { pixelRatio: 2 });
      }
    })
    .catch(() => undefined);

  map.addSource("wrecks", {
    type: "geojson",
    data,
    cluster: true,
    clusterMaxZoom: 12,
    clusterRadius: 50,
  });

  for (const layer of createWreckLayers(selectedId)) {
    map.addLayer(layer);
  }
}
