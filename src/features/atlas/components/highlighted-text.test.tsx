import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HighlightedText, splitHighlightedText } from "./highlighted-text";

describe("HighlightedText", () => {
  it("finds case-insensitive text without treating it as markup", () => {
    expect(splitHighlightedText("RMS Titanic", "TITAN")).toEqual([
      { text: "RMS ", match: false },
      { text: "Titan", match: true },
      { text: "ic", match: false },
    ]);

    const { container } = render(
      <HighlightedText text={'<Titanic & Co>'} query="Titanic" />,
    );
    expect(screen.getByText("Titanic", { selector: "mark" })).toBeVisible();
    expect(container).toHaveTextContent("<Titanic & Co>");
    expect(document.querySelector("script")).toBeNull();
  });
});
