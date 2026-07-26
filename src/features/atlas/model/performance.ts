type AtlasMeasure =
  | "atlas:compact-cache-read"
  | "atlas:compact-fetch"
  | "atlas:compact-validate"
  | "atlas:geojson-build";

function canMeasure(): boolean {
  return typeof performance !== "undefined"
    && typeof performance.mark === "function"
    && typeof performance.measure === "function";
}

export function measureAtlasTask<T>(
  name: AtlasMeasure,
  task: () => T,
): T {
  if (!canMeasure()) return task();

  const start = `${name}:start`;
  const end = `${name}:end`;
  performance.mark(start);

  try {
    return task();
  } finally {
    performance.mark(end);
    performance.measure(name, start, end);
    performance.clearMarks(start);
    performance.clearMarks(end);
  }
}

export async function measureAtlasAsync<T>(
  name: AtlasMeasure,
  task: () => Promise<T>,
): Promise<T> {
  if (!canMeasure()) return task();

  const start = `${name}:start`;
  const end = `${name}:end`;
  performance.mark(start);

  try {
    return await task();
  } finally {
    performance.mark(end);
    performance.measure(name, start, end);
    performance.clearMarks(start);
    performance.clearMarks(end);
  }
}
