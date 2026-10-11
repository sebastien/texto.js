import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { renderBackend } from "../src/js/texto/backends/index.js";
import { createMarkdownParser } from "../src/js/texto/profiles/markdown.js";
const TESTS_DIR = join(import.meta.dirname, "../deps/md/tests");
function normalizeHTML(html) {
  const preservedBlocks = [];
  let processed = html.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, (match) => {
    preservedBlocks.push(match);
    return `\x00${preservedBlocks.length - 1}\x00`;
  }).replace(/<code[^>]*>[\s\S]*?<\/code>/g, (match) => {
    if (!match.includes("\x00")) {
      preservedBlocks.push(match);
      return `\x00${preservedBlocks.length - 1}\x00`;
    }
    return match;
  });
  processed = processed.replace(/\r\n/g, `
`).replace(/>\s+</g, "><").replace(/\s+/g, " ").replace(/<hr \/>/g, "<hr/>").replace(/<img([^>]+)\/>/g, "<img$1>");
  for (let i = 0;i < preservedBlocks.length; i++) {
    processed = processed.replace(`\x00${i}\x00`, preservedBlocks[i]);
  }
  return processed.trim();
}
function getTestFiles() {
  const files = [];
  const entries = readdirSync(TESTS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory())
      continue;
    if (entry.name.endsWith(".md")) {
      files.push(entry.name);
    }
  }
  return files.sort();
}
describe("Markdown Test Suite", () => {
  const testFiles = getTestFiles();
  console.log(`Running ${testFiles.length} markdown tests from ${TESTS_DIR}`);
  for (const file of testFiles) {
    const testName = file.replace(".md", "");
    test(testName, () => {
      const mdPath = join(TESTS_DIR, file);
      const input = readFileSync(mdPath, "utf8");
      const outPath = join(TESTS_DIR, `${testName}.out`);
      let expected;
      try {
        expected = readFileSync(outPath, "utf8").trim();
      } catch (error) {
        throw new Error(`Missing expected output file: ${outPath}`);
      }
      const parser = createMarkdownParser();
      const doc = parser.parse(input);
      const fullHTML = renderBackend(doc, "html");
      const bodyMatch = fullHTML.match(/<body>([\s\S]*?)<\/body>/);
      let actual = bodyMatch ? bodyMatch[1].trim() : fullHTML.trim();
      const normalizedActual = normalizeHTML(actual);
      const normalizedExpected = normalizeHTML(expected);
      if (normalizedActual !== normalizedExpected) {
        console.log(`
Test: ${testName}`);
        console.log("Expected:", normalizedExpected);
        console.log("Actual:  ", normalizedActual);
      }
      expect(normalizedActual).toBe(normalizedExpected);
    });
  }
});
