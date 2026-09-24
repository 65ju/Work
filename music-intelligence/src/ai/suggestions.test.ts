import { describe, expect, it } from "vitest";
import { FenceFilter, normalize, parseSuggestionBlock } from "./suggestions";

describe("FenceFilter", () => {
  it("never leaks the suggestion block, even when the fence is split across chunks", () => {
    const f = new FenceFilter();
    const chunks = ["Here are some ideas.\n\n``", "`sugges", 'tions\n[{"title":"A","artist":"B"}]\n```'];
    const out = chunks.map((c) => f.push(c)).join("") + f.flush();
    expect(out).toBe("Here are some ideas.\n\n");
  });

  it("passes plain text through", () => {
    const f = new FenceFilter();
    expect(f.push("Hello ") + f.push("world") + f.flush()).toBe("Hello world");
  });
});

describe("parseSuggestionBlock", () => {
  it("parses valid suggestions and defaults optional fields", () => {
    const text = 'Try these\n```suggestions\n[{"title":"Song","artist":"Band"}]\n```';
    expect(parseSuggestionBlock(text)).toEqual([{ title: "Song", artist: "Band", reason: "", kind: "new" }]);
  });

  it("returns nothing for malformed JSON", () => {
    expect(parseSuggestionBlock("```suggestions\n[{oops}]\n```")).toEqual([]);
  });
});

describe("normalize", () => {
  it("ignores remaster tags, accents and punctuation", () => {
    expect(normalize("Café (2011 Remaster)")).toBe(normalize("cafe"));
    expect(normalize("Song - Radio Edit")).toBe("song");
  });
});
