import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createAtlasStore } from "@/features/atlas/model/atlas-store";
import { AtlasStoreProvider } from "@/features/atlas/model/atlas-store-provider";
import { AtlasToolbar } from "./atlas-toolbar";

describe("AtlasToolbar", () => {
  it("selects an in-memory result with keyboard navigation", async () => {
    const user = userEvent.setup();
    const store = createAtlasStore({
      era: "after-1945",
      compactWrecks: [
        { id: "hms-1", name: "HMS Test", category: "Wreck", type: "Warship", coordinates: [1, 2], sunkYear: 1950, depthM: 20 },
      ],
    });
    const flyTo = vi.fn();
    window.addEventListener("atlas:fly-to", flyTo);

    render(
      <AtlasStoreProvider store={store}>
        <AtlasToolbar />
      </AtlasStoreProvider>,
    );

    const input = screen.getByRole("combobox", { name: "Search wrecks" });
    await user.type(input, "test");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(store.getState().selectedWreckId).toBe("hms-1");
    expect(store.getState().era).toBe("all");
    expect(flyTo).toHaveBeenCalledTimes(1);
    window.removeEventListener("atlas:fly-to", flyTo);
  });
});
