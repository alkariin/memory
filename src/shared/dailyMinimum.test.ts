import { describe, it, expect } from "vitest";
import { resolveDailyFillers } from "./dailyMinimum";

function makeWords(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `w${i}` }));
}

describe("resolveDailyFillers", () => {
  it("tops a short day up to the minimum with words outside the session", () => {
    const fillers = resolveDailyFillers(["w0", "w1"], makeWords(40), 15, null);

    expect(fillers).toHaveLength(13);
    expect(fillers).not.toContain("w0");
    expect(fillers).not.toContain("w1");
    expect(new Set(fillers).size).toBe(13);
  });

  it("adds nothing when the day already reaches the minimum", () => {
    const session = makeWords(15).map((w) => w.id);

    expect(resolveDailyFillers(session, makeWords(40), 15, null)).toEqual([]);
  });

  it("gives what the list has when it is too small to reach the minimum", () => {
    const fillers = resolveDailyFillers(["w0"], makeWords(5), 15, null);

    expect(fillers).toHaveLength(4);
  });

  it("draws at random rather than in list order", () => {
    // A fixed order would always return w2..w14; a random draw practically never does
    const draws = Array.from({ length: 20 }, () =>
      resolveDailyFillers(["w0", "w1"], makeWords(40), 15, null).join(),
    );
    const inOrder = makeWords(15).slice(2).map((w) => w.id).join();

    expect(draws.filter((d) => d === inOrder)).toHaveLength(0);
  });

  it("keeps today's fillers, in the same order", () => {
    const stored = ["w7", "w3", "w9"];

    expect(resolveDailyFillers(["w0"], makeWords(40), 4, stored)).toEqual(stored);
  });

  it("draws more when the stored fillers no longer reach the minimum", () => {
    const fillers = resolveDailyFillers(["w0"], makeWords(40), 6, ["w7", "w3"]);

    expect(fillers.slice(0, 2)).toEqual(["w7", "w3"]);
    expect(fillers).toHaveLength(5);
    expect(new Set(fillers).size).toBe(5);
  });

  it("drops a stored filler that was deleted or joined the session", () => {
    const fillers = resolveDailyFillers(["w0", "w3"], makeWords(5), 3, ["w3", "gone", "w4"]);

    expect(fillers).toEqual(["w4"]);
  });
});
