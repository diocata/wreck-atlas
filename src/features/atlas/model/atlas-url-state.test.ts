import { describe, expect, it } from "vitest";
import {
  buildAtlasUrl,
  defaultAtlasUrlState,
  parseAtlasUrlState,
} from "./atlas-url-state";

describe("atlas URL state", () => {
  it("parses supported state and rejects malformed values", () => {
    expect(parseAtlasUrlState(new URLSearchParams(
      "wreck=42&era=1900-1945&kind=wreck&depth=10-30",
    ))).toEqual({
      selectedWreckId: "42",
      era: "1900-1945",
      recordKind: "wreck",
      depthBand: "10-30",
    });

    expect(parseAtlasUrlState(new URLSearchParams(
      "wreck=&era=anything&kind=boat&depth=-1",
    ))).toEqual(defaultAtlasUrlState);
  });

  it("writes only committed non-default state and preserves unrelated params", () => {
    const url = buildAtlasUrl("https://wreck-atlas.com/?campaign=launch", {
      selectedWreckId: "42",
      era: "after-1945",
      recordKind: "obstruction",
      depthBand: "unknown",
    });

    expect(url.searchParams.get("campaign")).toBe("launch");
    expect(url.searchParams.get("wreck")).toBe("42");
    expect(url.searchParams.get("era")).toBe("after-1945");
    expect(url.searchParams.get("kind")).toBe("obstruction");
    expect(url.searchParams.get("depth")).toBe("unknown");

    const reset = buildAtlasUrl(url, defaultAtlasUrlState);
    expect(reset.search).toBe("?campaign=launch");
  });
});
