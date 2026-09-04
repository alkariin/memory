import { describe, it, expect } from "vitest";
import {
  MAX_PROGRESS_SEGMENTS,
  maxSegmentsPerGroup,
  shouldUseContinuousBars,
} from "./reviewProgress";
import { TagGroup } from "./groupWordsByTag";

function makeGroup(tag: string, wordCount: number): TagGroup {
  return {
    tag,
    wordIds: Array.from({ length: wordCount }, (_, i) => `${tag}-${i}`),
  };
}

describe("maxSegmentsPerGroup", () => {
  it("gives the full budget to a single group", () => {
    expect(maxSegmentsPerGroup(1)).toBe(MAX_PROGRESS_SEGMENTS);
  });

  it("splits the budget across groups", () => {
    expect(maxSegmentsPerGroup(2)).toBe(20);
    expect(maxSegmentsPerGroup(4)).toBe(10);
  });

  it("never drops below one segment per group", () => {
    expect(maxSegmentsPerGroup(1000)).toBe(1);
  });

  it("falls back to the full budget when there are no groups", () => {
    expect(maxSegmentsPerGroup(0)).toBe(MAX_PROGRESS_SEGMENTS);
  });
});

describe("shouldUseContinuousBars", () => {
  it("keeps per-word segments for a small session", () => {
    expect(shouldUseContinuousBars([makeGroup("A", 5), makeGroup("B", 3)])).toBe(false);
  });

  it("keeps per-word segments for a single group at the limit", () => {
    expect(shouldUseContinuousBars([makeGroup("A", MAX_PROGRESS_SEGMENTS)])).toBe(false);
  });

  it("switches to continuous bars when one group exceeds the limit", () => {
    expect(shouldUseContinuousBars([makeGroup("A", MAX_PROGRESS_SEGMENTS + 1)])).toBe(true);
  });

  it("switches to continuous bars when many groups shrink the per-group limit", () => {
    const groups = Array.from({ length: 5 }, (_, i) => makeGroup(`T${i}`, 9));
    // 5 groups allow 8 segments each, so 9 words per group is too many
    expect(shouldUseContinuousBars(groups)).toBe(true);
  });

  it("handles an empty session", () => {
    expect(shouldUseContinuousBars([])).toBe(false);
  });
});
