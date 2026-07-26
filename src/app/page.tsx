import { AtlasShell } from "@/features/atlas/components/atlas-shell";
import { parseAtlasUrlState } from "@/features/atlas/model/atlas-url-state";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const values = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }

  return <AtlasShell initialUrlState={parseAtlasUrlState(params)} />;
}
