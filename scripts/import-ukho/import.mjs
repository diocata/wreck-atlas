import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";

const expectedHeaders = [
  "wreck_id",
  "wreck_category",
  "obstruction_category",
  "status",
  "classification",
  "position",
  "latitude",
  "longitude",
  "horizontal_datum",
  "limits",
  "position_method",
  "depth",
  "height",
  "depth_method",
  "depth_quality",
  "depth_accuracy",
  "water_depth",
  "water_level_effect",
  "vertical_datum",
  "reported_year",
  "name",
  "type",
  "flag",
  "length",
  "width",
  "draught",
  "sonar_length",
  "sonar_width",
  "shadow_height",
  "orientation",
  "tonnage",
  "tonnage_type",
  "cargo",
  "conspic_visual",
  "conspic_radar",
  "date_sunk",
  "non_sub_contact",
  "bottom_texture",
  "scour_dimensions",
  "debris_field",
  "original_sensor",
  "last_sensor",
  "original_detection_year",
  "last_detection_year",
  "original_source",
  "markers",
  "circumstances_of_loss",
  "surveying_details",
  "general_comments",
  "last_amended_date",
];

const source = "ukho";
const defaultBatchSize = 500;

function parseArguments(argv) {
  const options = { dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const name = argument.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }

    options[name] = value;
    index += 1;
  }

  return options;
}

function parseQuotedTsv(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "\t" && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) {
    throw new Error("Unclosed quoted field");
  }

  values.push(value);
  return values;
}

function nullableText(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCoordinate(raw, axis, report, sourceRowNumber) {
  const match = raw.trim().match(/^(\d{1,3})\s+(\d+(?:\.\d+)?)\s+([NSEW])$/i);

  if (!match) {
    throw new Error(
      `Invalid ${axis} coordinate at source row ${sourceRowNumber}: ${raw}`,
    );
  }

  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  const hemisphere = match[3].toUpperCase();

  if (
    minutes < 0
    || minutes > 60
    || (axis === "latitude" && !["N", "S"].includes(hemisphere))
    || (axis === "longitude" && !["E", "W"].includes(hemisphere))
  ) {
    throw new Error(
      `Out-of-range ${axis} coordinate at source row ${sourceRowNumber}: ${raw}`,
    );
  }

  if (minutes === 60) {
    report.normalizedSixtyMinuteCoordinates.push({
      sourceRowNumber,
      axis,
      raw,
    });
  }

  let decimal = degrees + minutes / 60;

  if (hemisphere === "S" || hemisphere === "W") {
    decimal *= -1;
  }

  const maximum = axis === "latitude" ? 90 : 180;

  if (Math.abs(decimal) > maximum) {
    throw new Error(
      `Out-of-range ${axis} coordinate at source row ${sourceRowNumber}: ${raw}`,
    );
  }

  return decimal;
}

function parseBoundedNumber(raw, minimum, maximum, field, report) {
  const value = nullableText(raw);

  if (value === null) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    report.normalizedMeasurementAnomalies[field] ??= [];

    if (report.normalizedMeasurementAnomalies[field].length < 20) {
      report.normalizedMeasurementAnomalies[field].push(value);
    }

    return null;
  }

  return number;
}

function parseYear(raw) {
  const match = raw.trim().match(/^(\d{4})/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  return year >= 1000 && year <= 2200 ? year : null;
}

function parseSourceDate(raw, report, sourceRowNumber) {
  const value = nullableText(raw);

  if (value === null) {
    return null;
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (!match) {
    report.invalidSourceUpdatedDates.push({ sourceRowNumber, value });
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    report.invalidSourceUpdatedDates.push({ sourceRowNumber, value });
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function makeRecord(
  row,
  sourceRowNumber,
  sourceRecordIndex,
  importRunId,
  report,
) {
  const sourceIdMissing = row.wreck_id.trim().length === 0;
  const sourceId = sourceIdMissing
    ? `missing-row-${sourceRowNumber}`
    : row.wreck_id.trim();

  if (sourceIdMissing) {
    report.missingSourceIds.push({ sourceRowNumber, generatedSourceId: sourceId });
  }

  const latitude = parseCoordinate(
    row.latitude,
    "latitude",
    report,
    sourceRowNumber,
  );
  const longitude = parseCoordinate(
    row.longitude,
    "longitude",
    report,
    sourceRowNumber,
  );

  return {
    import_run_id: importRunId,
    source,
    source_id: sourceId,
    source_record_index: sourceRecordIndex,
    source_row_number: sourceRowNumber,
    source_id_missing: sourceIdMissing,
    name: nullableText(row.name),
    category: nullableText(row.wreck_category),
    obstruction_category: nullableText(row.obstruction_category),
    status: nullableText(row.status),
    classification: nullableText(row.classification),
    vessel_type: nullableText(row.type),
    flag: nullableText(row.flag),
    longitude,
    latitude,
    position_raw:
      nullableText(row.position) ?? `${row.latitude.trim()},${row.longitude.trim()}`,
    horizontal_datum: nullableText(row.horizontal_datum),
    limits_raw: nullableText(row.limits),
    position_method: nullableText(row.position_method),
    depth_m: parseBoundedNumber(row.depth, 0, 12000, "depth", report),
    height_m: parseBoundedNumber(row.height, 0, 12000, "height", report),
    depth_method: nullableText(row.depth_method),
    depth_quality: nullableText(row.depth_quality),
    depth_accuracy: nullableText(row.depth_accuracy),
    water_depth_m: parseBoundedNumber(
      row.water_depth,
      0,
      12000,
      "water_depth",
      report,
    ),
    water_level_effect: nullableText(row.water_level_effect),
    vertical_datum: nullableText(row.vertical_datum),
    reported_year: parseYear(row.reported_year),
    length_m: parseBoundedNumber(row.length, 0, 12000, "length", report),
    width_m: parseBoundedNumber(row.width, 0, 12000, "width", report),
    draught_m: parseBoundedNumber(row.draught, 0, 12000, "draught", report),
    sonar_length_m: parseBoundedNumber(
      row.sonar_length,
      0,
      12000,
      "sonar_length",
      report,
    ),
    sonar_width_m: parseBoundedNumber(
      row.sonar_width,
      0,
      12000,
      "sonar_width",
      report,
    ),
    shadow_height_m: parseBoundedNumber(
      row.shadow_height,
      0,
      12000,
      "shadow_height",
      report,
    ),
    orientation_degrees: parseBoundedNumber(
      row.orientation,
      0,
      360,
      "orientation",
      report,
    ),
    tonnage: parseBoundedNumber(
      row.tonnage,
      0,
      1_000_000_000_000,
      "tonnage",
      report,
    ),
    tonnage_type: nullableText(row.tonnage_type),
    cargo: nullableText(row.cargo),
    conspic_visual: nullableText(row.conspic_visual),
    conspic_radar: nullableText(row.conspic_radar),
    sunk_date_raw: nullableText(row.date_sunk),
    sunk_year: parseYear(row.date_sunk),
    non_sub_contact: nullableText(row.non_sub_contact),
    bottom_texture: nullableText(row.bottom_texture),
    scour_dimensions: nullableText(row.scour_dimensions),
    debris_field: nullableText(row.debris_field),
    original_sensor: nullableText(row.original_sensor),
    last_sensor: nullableText(row.last_sensor),
    original_detection_year_raw: nullableText(row.original_detection_year),
    last_detection_year_raw: nullableText(row.last_detection_year),
    original_source: nullableText(row.original_source),
    markers: nullableText(row.markers),
    circumstances_of_loss: nullableText(row.circumstances_of_loss),
    surveying_details: nullableText(row.surveying_details),
    general_comments: nullableText(row.general_comments),
    source_updated_on: parseSourceDate(
      row.last_amended_date,
      report,
      sourceRowNumber,
    ),
    raw: row,
    published: false,
    active: true,
  };
}

async function insertBatch({
  apiUrl,
  importToken,
  publishableKey,
  records,
  attempt = 1,
}) {
  const response = await fetch(
    `${apiUrl}/rest/v1/rpc/import_ukho_wreck_batch`,
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provided_token: importToken,
        batch_records: records,
      }),
    },
  );

  if (response.ok) {
    return;
  }

  const responseBody = await response.text();
  const retryable = response.status === 429 || response.status >= 500;

  if (retryable && attempt < 6) {
    await new Promise((resolve) => {
      setTimeout(resolve, 500 * 2 ** (attempt - 1));
    });

    return insertBatch({
      apiUrl,
      importToken,
      publishableKey,
      records,
      attempt: attempt + 1,
    });
  }

  throw new Error(
    `Supabase insert failed (${response.status}): ${responseBody.slice(0, 1000)}`,
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const filePath = options.file ?? process.env.UKHO_WRECKS_FILE;
  const apiUrl = (options.url ?? process.env.SUPABASE_URL)?.replace(/\/$/, "");
  const publishableKey =
    options.key ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const importRunId =
    options["import-run-id"] ?? process.env.UKHO_IMPORT_RUN_ID;
  const importToken =
    options["import-token"] ?? process.env.UKHO_IMPORT_TOKEN;
  const batchSize = Number(options["batch-size"] ?? defaultBatchSize);

  if (!filePath) {
    throw new Error("Provide --file or UKHO_WRECKS_FILE");
  }

  if (
    !options.dryRun
    && (!apiUrl || !publishableKey || !importRunId || !importToken)
  ) {
    throw new Error(
      "A live import requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, UKHO_IMPORT_RUN_ID, and UKHO_IMPORT_TOKEN (or their matching flags)",
    );
  }

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    throw new Error("--batch-size must be an integer between 1 and 1000");
  }

  const fileInfo = await stat(filePath);
  const report = {
    filePath,
    sourceSizeBytes: fileInfo.size,
    expectedHeaders,
    rowsRead: 0,
    uniqueSourceIds: 0,
    duplicateOccurrences: 0,
    missingSourceIds: [],
    normalizedSixtyMinuteCoordinates: [],
    normalizedMeasurementAnomalies: {},
    invalidSourceUpdatedDates: [],
    requestedInsertCount: 0,
    dryRun: options.dryRun,
  };
  const sourceIdOccurrences = new Map();
  const input = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  let headers;
  let batch = [];

  for await (const line of input) {
    if (!headers) {
      headers = line.split("\t");

      if (
        headers.length !== expectedHeaders.length
        || headers.some((header, index) => header !== expectedHeaders[index])
      ) {
        throw new Error("The source headers do not match the expected UKHO schema");
      }

      continue;
    }

    report.rowsRead += 1;
    const values = parseQuotedTsv(line);

    if (values.length !== expectedHeaders.length) {
      throw new Error(
        `Expected ${expectedHeaders.length} fields at source row ${report.rowsRead}, found ${values.length}`,
      );
    }

    const row = Object.fromEntries(
      expectedHeaders.map((header, index) => [header, values[index]]),
    );
    const sourceIdKey =
      row.wreck_id.trim() || `missing-row-${report.rowsRead}`;
    const sourceRecordIndex = (sourceIdOccurrences.get(sourceIdKey) ?? 0) + 1;
    sourceIdOccurrences.set(sourceIdKey, sourceRecordIndex);

    if (sourceRecordIndex > 1) {
      report.duplicateOccurrences += 1;
    }

    batch.push(
      makeRecord(
        row,
        report.rowsRead,
        sourceRecordIndex,
        importRunId,
        report,
      ),
    );

    if (batch.length >= batchSize) {
      if (!options.dryRun) {
        await insertBatch({
          apiUrl,
          importToken,
          publishableKey,
          records: batch,
        });
        report.requestedInsertCount += batch.length;
      }

      batch = [];

      if (report.rowsRead % 5000 === 0) {
        process.stderr.write(`Validated ${report.rowsRead} UKHO rows\n`);
      }
    }
  }

  if (batch.length > 0 && !options.dryRun) {
    await insertBatch({
      apiUrl,
      importToken,
      publishableKey,
      records: batch,
    });
    report.requestedInsertCount += batch.length;
  }

  report.uniqueSourceIds = sourceIdOccurrences.size;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
