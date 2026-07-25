# Wreck Atlas

Wreck Atlas is an educational, map-first way to explore documented
shipwrecks. Search, filtering, selection, record details, and source context
stay on a single interactive map.

> Wreck Atlas is for exploration and education. It is **not for marine
> navigation**.

## Local development

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

## Checks

```bash
pnpm lint
pnpm build
pnpm audit
```

## Data and attribution

The atlas currently serves 102,625 validated records from the July 2026 UK
Hydrographic Office Global Wrecks and Obstructions release. Public application
paths expose normalized, published records only; raw source rows and import
audit data remain private.

- [UKHO marine data](https://www.admiralty.co.uk/access-data/marine-data)
- [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
- [OpenFreeMap](https://openfreemap.org/)
- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

The completed July 2026 importer is release-specific and must not be reused for
a later release without staging and reconciliation. See
[`scripts/import-ukho/README.md`](scripts/import-ukho/README.md) for the
validation workflow and safeguards.
