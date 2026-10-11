import { describe, expect, test } from "bun:test";
import diff from "fast-diff";
import { apply, delta, revert, setDiffEngine } from "../src/js/texto/index.js";
describe("texto/delta", () => {
  test("delta fallback heuristic keeps contiguous replacement behavior", () => {
    setDiffEngine(null);
    const patches = delta("A B C D", "A X C Y D");
    expect(patches).toEqual([
      { retain: 2 },
      { delete: 3 },
      { insert: "X C Y" },
      { retain: 2 }
    ]);
  });
  test("delta returns empty ops when text is unchanged", () => {
    setDiffEngine(null);
    expect(delta("abc", "abc")).toEqual([]);
  });
  test("delta + apply handles insertion", () => {
    setDiffEngine(null);
    const oldtext = "hello world";
    const newtext = "hello brave world";
    const patches = delta(oldtext, newtext);
    const applied = apply(oldtext, patches);
    expect(applied.text).toBe(newtext);
    expect(applied.range).toEqual([6, 12]);
  });
  test("delta + apply handles deletion", () => {
    setDiffEngine(null);
    const oldtext = "hello brave world";
    const newtext = "hello world";
    const patches = delta(oldtext, newtext);
    const applied = apply(oldtext, patches);
    expect(applied.text).toBe(newtext);
    expect(applied.range).toEqual([6, 12]);
  });
  test("delta + apply handles replacement", () => {
    setDiffEngine(null);
    const oldtext = "foo bar baz";
    const newtext = "foo qux baz";
    const patches = delta(oldtext, newtext);
    const applied = apply(oldtext, patches);
    expect(applied.text).toBe(newtext);
    expect(applied.range).toEqual([4, 7]);
  });
  test("revert inverts forward patches", () => {
    setDiffEngine(null);
    const oldtext = "alpha beta gamma";
    const newtext = "alpha zeta gamma";
    const forward = delta(oldtext, newtext);
    const backward = revert(oldtext, newtext, forward);
    const next = apply(oldtext, forward);
    expect(next.text).toBe(newtext);
    const prev = apply(next.text, backward);
    expect(prev.text).toBe(oldtext);
  });
  test("revert without patches falls back to reverse delta", () => {
    setDiffEngine(null);
    const oldtext = "one two";
    const newtext = "one three two";
    const backward = revert(oldtext, newtext);
    const reverted = apply(newtext, backward);
    expect(reverted.text).toBe(oldtext);
  });
  test("delta respects optional start/end hints", () => {
    setDiffEngine(null);
    const oldtext = "abc123xyz";
    const newtext = "abcHELLOxyz";
    const patches = delta(oldtext, newtext, 3, 6);
    const applied = apply(oldtext, patches);
    expect(applied.text).toBe(newtext);
  });
  test("delta uses fast-diff engine when configured", () => {
    setDiffEngine(diff);
    const oldtext = "A B C D";
    const newtext = "A X C Y D";
    const patches = delta(oldtext, newtext);
    expect(patches).toEqual([
      { retain: 2 },
      { delete: 1 },
      { insert: "X" },
      { retain: 2 },
      { insert: " Y" },
      { retain: 2 }
    ]);
    const applied = apply(oldtext, patches);
    expect(applied.text).toBe(newtext);
  });
});
