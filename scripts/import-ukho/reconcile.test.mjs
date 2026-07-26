import { describe, expect, it } from "vitest";
import {
  buildStableEvidenceKey,
  diffNormalizedRecords,
  reconcileReleases,
} from "./reconcile.mjs";

function record(overrides = {}) {
  return {
    id: 1,
    source_id: "UKHO-1",
    source_record_index: 1,
    source_id_missing: false,
    longitude: -4,
    latitude: 50,
    name: "Example",
    vessel_type: "Cargo vessel",
    category: "non-dangerous wreck",
    obstruction_category: null,
    depth_m: 20,
    surveying_details: "Surveyed",
    source_updated_on: "2026-07-01",
    ...overrides,
  };
}

describe("future UKHO release reconciliation", () => {
  it("matches a unique source ID and flags populated-to-blank changes", () => {
    const current = record();
    const next = record({
      id: undefined,
      depth_m: null,
      surveying_details: null,
    });
    const diff = diffNormalizedRecords(current, next);

    expect(diff.changeKind).toBe("updated");
    expect(diff.dataLossFields).toEqual([
      "depth_m",
      "surveying_details",
    ]);

    const result = reconcileReleases([current], [next]);
    expect(result.matches[0]).toMatchObject({
      matchMethod: "unique-source-id",
      reviewRequired: true,
    });
    expect(result.summary.withPotentialDataLoss).toBe(1);
  });

  it("matches repeated IDs by stable evidence even when occurrence order changes", () => {
    const first = record({
      id: 1,
      source_id: "DUPLICATE",
      source_record_index: 1,
      longitude: 1,
      name: "First",
    });
    const second = record({
      id: 2,
      source_id: "DUPLICATE",
      source_record_index: 2,
      longitude: 2,
      name: "Second",
    });
    const nextSecond = {
      ...second,
      id: undefined,
      source_record_index: 1,
    };
    const nextFirst = {
      ...first,
      id: undefined,
      source_record_index: 2,
    };

    const result = reconcileReleases(
      [first, second],
      [nextSecond, nextFirst],
    );

    expect(result.ambiguous).toHaveLength(0);
    expect(result.matches).toHaveLength(2);
    expect(result.matches.map((match) => [
      match.current.name,
      match.next.name,
      match.matchMethod,
    ])).toEqual([
      ["First", "First", "stable-evidence"],
      ["Second", "Second", "stable-evidence"],
    ]);
  });

  it("does not guess when repeated IDs have indistinguishable evidence", () => {
    const current = [
      record({ id: 1, source_id: "DUP", source_record_index: 1 }),
      record({ id: 2, source_id: "DUP", source_record_index: 2 }),
    ];
    const next = current.map((item) => ({ ...item, id: undefined }));

    const result = reconcileReleases(current, next);

    expect(result.matches).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(1);
    expect(result.summary.ambiguousGroups).toBe(1);
  });

  it("keeps new and missing records as reviewed actions, never deletions", () => {
    const result = reconcileReleases(
      [record({ source_id: "OLD" })],
      [record({ id: undefined, source_id: "NEW" })],
    );

    expect(result.newRecords).toHaveLength(1);
    expect(result.deactivationCandidates).toHaveLength(1);
    expect(result.deactivationCandidates[0].reason).toContain("absent");
  });

  it("uses normalized coordinates and source attributes as stable evidence", () => {
    const upper = record({ name: "  EXAMPLE  " });
    const lower = record({ name: "example" });
    expect(buildStableEvidenceKey(upper)).toBe(
      buildStableEvidenceKey(lower),
    );
  });
});
