import { AtlasShell } from "@/components/atlas/atlas-shell";
import { getWreckDataSource } from "@/lib/repositories/wreck-repository";

export default function Home() {
  return <AtlasShell dataSource={getWreckDataSource()} />;
}
