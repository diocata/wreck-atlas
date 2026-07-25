# Wreck Atlas

Wreck Atlas is an educational, map-first experience for exploring documented
shipwrecks and obstructions around the world. It turns 102,625 published
records into an approachable interactive atlas while keeping their source and
limitations visible.

> Wreck Atlas is for exploration and education. It is **not for marine
> navigation**.

## Why this project

Official wreck datasets contain valuable historical, geographic, and maritime
information, but they are often distributed as bulk records designed for
specialist workflows. That makes them difficult for a curious visitor to
discover and understand.

Wreck Atlas gives those records a more accessible home. The map remains the
primary interface: visitors can find a wreck, inspect the available story and
survey data, and see where the information came from without moving through a
database or leaving the map.

## What you can do

- Explore documented wreck and obstruction records on a global map
- Search for wrecks by name and move directly to their recorded position
- Filter the atlas by historical era
- Expand dense areas through interactive map clusters
- Inspect vessel details, reported depth, coordinates, circumstances of loss,
  and survey notes when available
- Trace each record back to its source and licence information

## Data and responsibility

The atlas currently uses 102,625 validated records from the July 2026 UK
Hydrographic Office Global Wrecks and Obstructions release. Public application
paths expose normalized, published fields only; complete raw source rows and
import audit data remain private.

Positions, depths, classifications, and historical details may be approximate,
incomplete, or outdated. Always consult current official charts and relevant
maritime authorities for navigational or operational decisions.

- [UKHO marine data](https://www.admiralty.co.uk/access-data/marine-data)
- [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
- [OpenFreeMap](https://openfreemap.org/)
- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

## Run locally

Requires Node.js 22 and pnpm 10.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Set these server-side values in `.env.local`:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Use only a Supabase publishable key. Never place a secret or service-role key
in this repository or in browser-exposed environment variables.

Open [http://localhost:3000](http://localhost:3000).

## Project checks

```bash
pnpm lint
pnpm build
pnpm audit
```

## Updating the data

The completed July 2026 importer is release-specific and must not be reused for
a later release without staging and reconciliation. See
[`scripts/import-ukho/README.md`](scripts/import-ukho/README.md) for the
validation workflow and safeguards.
