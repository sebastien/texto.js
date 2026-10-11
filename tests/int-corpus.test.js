import { describe, test, expect } from "bun:test";
import { TextoParser } from "../src/js/texto/texto.js";
import { formatTexto } from "../src/js/texto/backends/texto.js";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
const TESTS_DIR = join(import.meta.dirname, "data");
function normalizeForComparison(text) {
  return text.replace(/\r\n/g, `
`).replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, `

`).trim();
}
describe("Texto Corpus Tests", () => {
  const files = readdirSync(TESTS_DIR).filter((f) => f.endsWith(".txto")).filter((f) => statSync(join(TESTS_DIR, f)).isFile()).sort();
  for (const file of files) {
    const filePath = join(TESTS_DIR, file);
    describe(file, () => {
      let content;
      test("reads file content", () => {
        content = readFileSync(filePath, "utf8");
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
      });
      test("parses successfully without errors", () => {
        const parser = new TextoParser;
        const doc = parser.parse(content);
        expect(doc).toBeDefined();
        expect(doc.type).toBe("document");
      });
      test("formatter stability - double roundtrip produces semantically same result", () => {
        const parser = new TextoParser;
        const doc1 = parser.parse(content);
        const format1 = formatTexto(doc1);
        const doc2 = parser.parse(format1);
        const format2 = formatTexto(doc2);
        const normalized1 = normalizeForComparison(format1);
        const normalized2 = normalizeForComparison(format2);
        expect(normalized2).toBe(normalized1);
      });
      test("parse stability - second parse produces equivalent AST", () => {
        const parser = new TextoParser;
        const doc1 = parser.parse(content);
        const format1 = formatTexto(doc1);
        const doc2 = parser.parse(format1);
        const format2 = formatTexto(doc2);
        const normalized1 = normalizeForComparison(format1);
        const normalized2 = normalizeForComparison(format2);
        expect(normalized2).toBe(normalized1);
      });
    });
  }
});
