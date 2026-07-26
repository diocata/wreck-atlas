const normalizedFields = [
  "source_id_missing",
  "name",
  "category",
  "obstruction_category",
  "status",
  "classification",
  "vessel_type",
  "flag",
  "longitude",
  "latitude",
  "position_raw",
  "horizontal_datum",
  "limits_raw",
  "position_method",
  "depth_m",
  "height_m",
  "depth_method",
  "depth_quality",
  "depth_accuracy",
  "water_depth_m",
  "water_level_effect",
  "vertical_datum",
  "reported_year",
  "length_m",
  "width_m",
  "draught_m",
  "sonar_length_m",
  "sonar_width_m",
  "shadow_height_m",
  "orientation_degrees",
  "tonnage",
  "tonnage_type",
  "cargo",
  "conspic_visual",
  "conspic_radar",
  "sunk_date_raw",
  "sunk_year",
  "non_sub_contact",
  "bottom_texture",
  "scour_dimensions",
  "debris_field",
  "original_sensor",
  "last_sensor",
  "original_detection_year_raw",
  "last_detection_year_raw",
  "original_source",
  "markers",
  "circumstances_of_loss",
  "surveying_details",
  "general_comments",
  "source_updated_on",
];

const evidenceFields = [
  "longitude",
  "latitude",
  "name",
  "vessel_type",
  "category",
  "obstruction_category",
  "position_raw",
];

function comparable(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return value;
}

function isPopulated(value) {
  const normalized = comparable(value);
  return normalized !== null;
}

function evidenceValue(field, value) {
  const normalized = comparable(value);
  if (
    normalized !== null
    && typeof normalized === "number"
    && (field === "longitude" || field === "latitude")
  ) {
    return normalized.toFixed(7);
  }
  return typeof normalized === "string"
    ? normalized.toLocaleLowerCase()
    : normalized;
}

export function buildStableEvidenceKey(record) {
  return JSON.stringify(
    evidenceFields.map((field) => evidenceValue(field, record[field])),
  );
}

export function diffNormalizedRecords(current, next) {
  const changedFields = [];
  const dataLossFields = [];

  for (const field of normalizedFields) {
    const currentValue = comparable(current[field]);
    const nextValue = comparable(next[field]);

    if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) continue;
    changedFields.push(field);
    if (isPopulated(currentValue) && !isPopulated(nextValue)) {
      dataLossFields.push(field);
    }
  }

  return {
    changedFields,
    dataLossFields,
    changeKind: changedFields.length === 0 ? "unchanged" : "updated",
    reviewRequired: changedFields.length > 0,
  };
}

function groupBySourceId(records) {
  const groups = new Map();

  for (const record of records) {
    const key = record.source_id_missing
      ? "__missing-source-id__"
      : record.source_id;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return groups;
}

function groupByEvidence(records) {
  const groups = new Map();

  for (const record of records) {
    const key = buildStableEvidenceKey(record);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return groups;
}

function createMatch(current, next, matchMethod) {
  return {
    current,
    next,
    matchMethod,
    ...diffNormalizedRecords(current, next),
  };
}

function matchRepeatedSourceId(currentRecords, nextRecords) {
  const currentByEvidence = groupByEvidence(currentRecords);
  const nextByEvidence = groupByEvidence(nextRecords);
  const matches = [];
  const matchedCurrent = new Set();
  const matchedNext = new Set();

  for (const [key, currentCandidates] of currentByEvidence) {
    const nextCandidates = nextByEvidence.get(key) ?? [];
    if (currentCandidates.length !== 1 || nextCandidates.length !== 1) continue;

    const current = currentCandidates[0];
    const next = nextCandidates[0];
    matches.push(createMatch(current, next, "stable-evidence"));
    matchedCurrent.add(current);
    matchedNext.add(next);
  }

  const remainingCurrent = currentRecords.filter(
    (record) => !matchedCurrent.has(record),
  );
  const remainingNext = nextRecords.filter(
    (record) => !matchedNext.has(record),
  );

  if (remainingCurrent.length === 1 && remainingNext.length === 1) {
    matches.push(createMatch(
      remainingCurrent[0],
      remainingNext[0],
      "remaining-occurrence",
    ));
    return { matches, ambiguous: null };
  }

  if (remainingCurrent.length === 0 && remainingNext.length === 0) {
    return { matches, ambiguous: null };
  }

  return {
    matches,
    ambiguous: {
      sourceId:
        remainingNext[0]?.source_id
        ?? remainingCurrent[0]?.source_id
        ?? null,
      current: remainingCurrent,
      next: remainingNext,
      reason: "Repeated source ID could not be matched one-to-one",
    },
  };
}

export function reconcileReleases(currentRecords, nextRecords) {
  const currentGroups = groupBySourceId(currentRecords);
  const nextGroups = groupBySourceId(nextRecords);
  const keys = new Set([...currentGroups.keys(), ...nextGroups.keys()]);
  const matches = [];
  const newRecords = [];
  const deactivationCandidates = [];
  const ambiguous = [];

  for (const key of keys) {
    const current = currentGroups.get(key) ?? [];
    const next = nextGroups.get(key) ?? [];
    const sourceIdMissing = key === "__missing-source-id__";

    if (current.length === 0) {
      newRecords.push(...next.map((record) => ({
        next: record,
        reviewRequired: true,
        reason: sourceIdMissing
          ? "New row without a source ID"
          : "Source ID is new in this release",
      })));
      continue;
    }

    if (next.length === 0) {
      deactivationCandidates.push(...current.map((record) => ({
        current: record,
        reviewRequired: true,
        reason: sourceIdMissing
          ? "Previous row without a source ID was not matched"
          : "Source ID is absent from the new release",
      })));
      continue;
    }

    if (!sourceIdMissing && current.length === 1 && next.length === 1) {
      matches.push(createMatch(current[0], next[0], "unique-source-id"));
      continue;
    }

    const repeated = matchRepeatedSourceId(current, next);
    matches.push(...repeated.matches);

    if (repeated.ambiguous) {
      if (sourceIdMissing) {
        newRecords.push(...repeated.ambiguous.next.map((record) => ({
          next: record,
          reviewRequired: true,
          reason: "Unmatched row without a stable source ID",
        })));
        deactivationCandidates.push(
          ...repeated.ambiguous.current.map((record) => ({
            current: record,
            reviewRequired: true,
            reason: "Previous row without a stable source ID was not matched",
          })),
        );
      } else {
        ambiguous.push(repeated.ambiguous);
      }
    }
  }

  return {
    matches,
    newRecords,
    deactivationCandidates,
    ambiguous,
    summary: {
      unchanged: matches.filter(
        (match) => match.changeKind === "unchanged",
      ).length,
      updated: matches.filter(
        (match) => match.changeKind === "updated",
      ).length,
      withPotentialDataLoss: matches.filter(
        (match) => match.dataLossFields.length > 0,
      ).length,
      inserted: newRecords.length,
      deactivationCandidates: deactivationCandidates.length,
      ambiguousGroups: ambiguous.length,
    },
  };
}

export const reconciliationFields = Object.freeze({
  normalized: normalizedFields,
  evidence: evidenceFields,
});
