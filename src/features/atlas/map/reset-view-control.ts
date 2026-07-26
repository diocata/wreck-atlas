import * as maplibregl from "maplibre-gl";

const defaultView = {
  center: [4, 25] as [number, number],
  zoom: 1.5,
  pitch: 0,
  bearing: 0,
  duration: 850,
};

export class ResetViewControl implements maplibregl.IControl {
  private container!: HTMLDivElement;
  private map?: maplibregl.Map;

  constructor(private readonly onReset?: () => void) {}

  onAdd(map: maplibregl.Map) {
    this.map = map;
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group reset-view-ctrl";

    const button = document.createElement("button");
    button.type = "button";
    button.title = "Reset view to default";
    button.setAttribute("aria-label", "Reset view to default");
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';
    button.onclick = () => {
      this.onReset?.();
      this.map?.flyTo(defaultView);
    };

    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode?.removeChild(this.container);
    this.map = undefined;
  }
}
