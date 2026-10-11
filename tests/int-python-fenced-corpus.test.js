import { describe, test, expect } from "bun:test";
import { TextoParser } from "../src/js/texto/texto.js";
import { readFileSync } from "fs";
import { join } from "path";
describe("Python corpus fenced block test", () => {
  test("parses syntax-preformatted-block.txto", () => {
    const filePath = join(import.meta.dirname, "data", "syntax-preformatted-block.txto");
    const content = readFileSync(filePath, "utf8");
    const parser = new TextoParser;
    const doc = parser.parse(content);
    const findPreElements = (node) => {
      const results = [];
      if (node.name === "preformatted") {
        results.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          results.push(...findPreElements(child));
        }
      }
      return results;
    };
    const preElements = findPreElements(doc.content);
    expect(preElements.length).toBe(3);
    expect(preElements[0].attributes.get("data-lang")).toBeFalsy();
    expect(preElements[1].attributes.get("data-lang")).toBe("c");
    expect(preElements[2].attributes.get("data-lang")).toBe("scheme");
    expect(preElements[2].attributes.get("data-output")).toBe("examples/account.ss");
    const cContent = preElements[1].children[0]?.content || "";
    expect(cContent).toContain("typedef struct ParsingContext");
    expect(cContent).toContain("struct Grammar*");
  });
});
