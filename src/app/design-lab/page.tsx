import type { Metadata } from "next";
import { DesignLab } from "./design-lab";

export const metadata: Metadata = {
  title: "Wreck Atlas — Design Lab",
  description: "Three light, futuristic visual directions for Wreck Atlas.",
};

export default function DesignLabPage() {
  return <DesignLab />;
}
