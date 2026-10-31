import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadEnv() {
  try {
    const content = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  } catch (err) {
    console.warn("Could not load .env.local", err);
  }
}

async function main() {
  await loadEnv();
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env.local");
  }

  console.log(`Connecting to ${url}...`);
  const select = "wreck_id,name,category,sunk_year,depth_m,location";
  const allRows = [];
  let page = 0;
  const batchSize = 10;
  let done = false;

  while (!done) {
    const promises = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = page * batchSize + i;
      const from = idx * 1000;
      const to = from + 999;

      promises.push(
        (async () => {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const res = await fetch(
                `${url}/rest/v1/wreck_map_points?select=${select}&published=is.true&active=is.true`,
                {
                  headers: {
                    apikey: key,
                    "Content-Type": "application/json",
                    Range: `${from}-${to}`,
                  },
                }
              );
              if (res.status === 416) return [];
              if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status}: ${text}`);
              }
              return await res.json();
            } catch (err) {
              if (String(err).includes("416")) return [];
              if (attempt === 3) throw err;
              await new Promise((r) => setTimeout(r, 300 * attempt));
            }
          }
        })()
      );
    }

    const results = await Promise.all(promises);
    for (const res of results) {
      if (!Array.isArray(res) || res.length === 0) {
        done = true;
      } else {
        allRows.push(...res);
        if (res.length < 1000) done = true;
      }
    }
    console.log(`Fetched page batch ${page + 1}: total ${allRows.length} rows...`);
    page++;
  }

  console.log(`Total rows fetched: ${allRows.length}. Mapping...`);
  const compact = allRows.map((row) => ({
    id: String(row.wreck_id),
    name: row.name || `UNIDENTIFIED WRECK ${row.wreck_id}`,
    category: row.category || "Unclassified record",
    type: row.category || "Wreck or obstruction",
    coordinates: [row.location.coordinates[0], row.location.coordinates[1]],
    sunkYear: row.sunk_year,
    depthM: row.depth_m,
  }));

  const outPath = resolve(process.cwd(), "src/server/wrecks/data/compact-wrecks.json");
  const jsonStr = JSON.stringify(compact);
  await writeFile(outPath, jsonStr, "utf8");
  console.log(`Successfully exported ${compact.length} compact wrecks to ${outPath} (${(jsonStr.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
