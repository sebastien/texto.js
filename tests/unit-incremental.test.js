import { describe, expect, test } from "bun:test";
import {
  applyAstPatches,
  delta,
  IncrementalParser,
  TextoParser,
  toJSON
} from "../src/js/texto/index.js";
describe("IncrementalParser", () => {
  test("init stores source and tree", () => {
    const source = `Hello

World`;
    const parser = new TextoParser;
    const incremental = new IncrementalParser;
    incremental.init(source);
    expect(incremental.source).toBe(source);
    expect(toJSON(incremental.tree, true)).toBe(toJSON(parser.parse(source), true));
  });
  test("patch updates source, tree and returns patches", () => {
    const source = `Hello

World`;
    const nextSource = `Hello!

World`;
    const parser = new TextoParser;
    const incremental = new IncrementalParser(source, parser);
    const patches = incremental.patch({ offset: 5, length: 0, text: "!" });
    expect(incremental.source).toBe(nextSource);
    expect(toJSON(incremental.tree, true)).toBe(toJSON(parser.parse(nextSource), true));
    const offsetPatch = patches.find((patch) => patch.type === "UPDATE_OFFSETS");
    expect(offsetPatch).toBeDefined();
    if (!offsetPatch || offsetPatch.type !== "UPDATE_OFFSETS") {
      throw new Error("missing UPDATE_OFFSETS patch");
    }
    expect(offsetPatch.delta).toBe(1);
    expect(offsetPatch.startOffset).toBe(5);
  });
  test("applyAstPatches can add and remove attributes", () => {
    const parser = new TextoParser;
    const tree = parser.parse("Hello");
    expect(tree.content.children.length).toBeGreaterThan(0);
    applyAstPatches(tree, [
      { type: "UPDATE_ATTRIBUTE", path: [1, 0], key: "class", value: "edited" }
    ]);
    expect(tree.content.children[0].attributes.get("class")).toBe("edited");
    applyAstPatches(tree, [
      { type: "UPDATE_ATTRIBUTE", path: [1, 0], key: "class", value: null }
    ]);
    expect(tree.content.children[0].attributes.get("class")).toBeUndefined();
  });
  test("patch uses local reparse without full parse", () => {
    const parser = new TextoParser;
    const originalParse = parser.parse.bind(parser);
    let parseCalls = 0;
    parser.parse = (input) => {
      parseCalls += 1;
      return originalParse(input);
    };
    const incremental = new IncrementalParser(`Hello

World`, parser);
    parseCalls = 0;
    incremental.patch({ offset: 5, length: 0, text: "!" });
    expect(parseCalls).toBe(0);
  });
  test("patch preserves structural block annotations", () => {
    const parser = new TextoParser;
    const incremental = new IncrementalParser(`Hello

World`, parser);
    incremental.patch({ offset: 5, length: 0, text: "!" });
    expect(incremental.tree.content.attributes.get("block")).toBe("container");
    expect(incremental.tree.content.attributes.get("level")).toBe("0");
    for (const child of incremental.tree.content.children) {
      expect(child.attributes.get("block")).toBe("block");
      expect(child.attributes.get("level")).toBe("1");
    }
  });
  test("patch preserves ids for updated nodes and assigns ids to inserted nodes", () => {
    const parser = new TextoParser;
    const incremental = new IncrementalParser(`Hello

World`, parser);
    const firstParagraphBefore = incremental.tree.content.children[0];
    const firstTextBefore = firstParagraphBefore.children[0];
    const existingIds = new Set;
    for (const block of incremental.tree.content.children) {
      existingIds.add(block.id);
      for (const child of block.children) {
        existingIds.add(child.id);
      }
    }
    incremental.patch({ offset: 5, length: 0, text: "!" });
    const firstParagraphAfter = incremental.tree.content.children[0];
    const firstTextAfter = firstParagraphAfter.children[0];
    expect(firstParagraphAfter.id).toBe(firstParagraphBefore.id);
    expect(firstTextAfter.id).toBe(firstTextBefore.id);
    incremental.patch({
      offset: incremental.source.length,
      length: 0,
      text: `

Again`
    });
    const insertedBlock = incremental.tree.content.children.at(-1);
    expect(insertedBlock).toBeDefined();
    expect(existingIds.has(insertedBlock.id)).toBe(false);
  });
  test("patch accepts multiple edits with original-source offsets", () => {
    const parser = new TextoParser;
    const incremental = new IncrementalParser("abcd", parser);
    const patches = incremental.patch([
      { offset: 1, length: 0, text: "X" },
      { offset: 3, length: 1, text: "Z" }
    ]);
    expect(incremental.source).toBe("aXbcZ");
    expect(toJSON(incremental.tree, true)).toBe(toJSON(parser.parse("aXbcZ"), true));
    expect(patches.some((patch) => patch.type === "UPDATE_OFFSETS")).toBe(true);
  });
  test("patch accepts delta operations", () => {
    const source = "A B C D";
    const target = "A X C Y D";
    const parser = new TextoParser;
    const incremental = new IncrementalParser(source, parser);
    const edits = delta(source, target);
    const patches = incremental.patch(edits);
    expect(incremental.source).toBe(target);
    expect(toJSON(incremental.tree, true)).toBe(toJSON(parser.parse(target), true));
    expect(patches.some((patch) => patch.type === "UPDATE_OFFSETS")).toBe(true);
  });
  test("patch rejects mixed patch arrays", () => {
    const incremental = new IncrementalParser("abc");
    const mixed = [
      { offset: 1, length: 0, text: "X" },
      { retain: 2 }
    ];
    expect(() => incremental.patch(mixed)).toThrow("Invalid patch input");
  });
});
