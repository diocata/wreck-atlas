import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const compactWrecks = [
  {
    id: "wreck-1",
    name: "RMS Titanic",
    category: "non-dangerous wreck",
    type: "Passenger ship",
    coordinates: [-49.9469, 41.7325],
    sunkYear: 1912,
    depthM: 3800,
  },
  {
    id: "wreck-2",
    name: "Titan",
    category: "dangerous wreck",
    type: "Cargo vessel",
    coordinates: [-49.9468, 41.7326],
    sunkYear: null,
    depthM: null,
  },
  {
    id: "obstruction-1",
    name: "Foul Ground Test",
    category: "foul ground",
    type: "Foul ground",
    coordinates: [-4, 50],
    sunkYear: null,
    depthM: null,
  },
];

function detail(id: string) {
  const compact = compactWrecks.find((wreck) => wreck.id === id)
    ?? compactWrecks[0];

  return {
    ...compact,
    sourceId: `UKHO-${compact.id}`,
    depthQuality: compact.depthM === null ? "depth unknown" : "depth known",
    status: "historic",
    positionMethod: "Differential Global Positioning System",
    sourceUpdatedOn: "2026-07-01",
    story: "A documented source record used for browser-level behavior tests.",
    surveyNotes: "Survey notes remain visible without replacing missing facts.",
    source: "UK Hydrographic Office Global Wrecks & Obstructions",
    sourceRelease: "July 2026",
    sourceUrl: "https://www.admiralty.co.uk/access-data/marine-data",
    licence: "Open Government Licence v3.0",
  };
}

async function useControlledData(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(value: string) {
          Reflect.set(window, "__copiedText", value);
          return Promise.resolve();
        },
      },
    });
  });

  await page.route("**/api/wrecks/compact", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { ETag: '"e2e-data"' },
      body: JSON.stringify({
        wrecks: compactWrecks,
        meta: { etag: '"e2e-data"' },
      }),
    }));
  await page.route(/\/api\/wrecks\/(?!compact(?:\?|$))[^/?]+(?:\?.*)?$/, (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split("/").at(-1) ?? "");
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(detail(id)),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await useControlledData(page);
});

test("restores shareable state and explains the dataset", async ({ page }) => {
  await page.goto(
    "/?wreck=wreck-1&era=1900-1945&kind=wreck&depth=100-plus",
  );

  await expect(page.getByRole("heading", { name: "RMS Titanic" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filter wreck records. 3 active" }),
  ).toBeVisible();

  const dataGuideButton = page.getByRole("button", {
    name: "UKHO · DATA GUIDE",
  });
  await dataGuideButton.click();
  await expect(
    page.getByRole("heading", { name: "What this atlas is showing" }),
  ).toBeVisible();
  await expect(page.getByText("Incomplete does not mean invalid")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "What this atlas is showing" }),
  ).toBeHidden();
  await expect(dataGuideButton).toBeFocused();
});

test("commits filters to the URL and preserves unknown values", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Filter wreck records/ }).click();
  await page.getByRole("button", { name: "Obstructions", exact: true }).click();
  await page.getByRole("button", { name: "Depth not reported" }).click();

  await expect(page).toHaveURL(/kind=obstruction/);
  await expect(page).toHaveURL(/depth=unknown/);
  await expect(
    page.getByRole("button", { name: "Filter wreck records. 2 active" }),
  ).toBeVisible();
});

test("highlights a name match and moves between nearby wrecks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("3 CACHED")).toBeVisible();

  await page.getByRole("combobox", { name: "Search wrecks" }).fill("titanic");
  await expect(page.locator(".search-results mark")).toHaveText("Titanic");
  await page.getByRole("option", { name: /RMS Titanic/ }).click();

  await expect(page.getByRole("heading", { name: "RMS Titanic" })).toBeVisible();
  await page.getByRole("button", { name: /Nearby signals/ }).click();
  await page.getByRole("button", { name: /Titan.*approximate map distance/ }).click();
  await expect(page.getByRole("heading", { name: "Titan", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/wreck=wreck-2/);
});

test("copies a durable wreck link", async ({ page }) => {
  await page.goto("/?wreck=wreck-1");
  await expect(page.getByRole("heading", { name: "RMS Titanic" })).toBeVisible();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Wreck link copied")).toBeVisible();

  const copied = await page.evaluate(
    () => Reflect.get(window, "__copiedText") as string,
  );
  expect(copied).toContain("wreck=wreck-1");
});

test("has no automatically detectable WCAG A or AA violations", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "One deterministic axe pass is sufficient");
  await page.goto("/");
  await expect(page.getByText("3 CACHED")).toBeVisible();

  const atlasResults = await new AxeBuilder({ page })
    .include(".atlas")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(atlasResults.violations).toEqual([]);

  await page.getByRole("button", { name: "UKHO · DATA GUIDE" }).click();
  const guideResults = await new AxeBuilder({ page })
    .include(".data-guide")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(guideResults.violations).toEqual([]);
});
