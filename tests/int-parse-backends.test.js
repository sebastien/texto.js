import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { renderCommand } from "../src/js/texto/cli/index.js";
import { renderBackend } from "../src/js/texto/backends/index.js";
import { parseFrontend } from "../src/js/texto/frontends/registry.js";
describe("parse output backends", () => {
  let tempDir;
  let fixturePath;
  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "texto-backends-"));
    fixturePath = join(tempDir, "sample.txto");
    writeFileSync(fixturePath, `Hello world
`);
  });
  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
  test("defaults to json backend", async () => {
    const output = await renderCommand({ file: fixturePath, format: "json" });
    expect(output).toContain('"type": "document"');
    expect(output).toContain('"content"');
  });
  test("includes 0-based block numbers with --positions in json", async () => {
    writeFileSync(fixturePath, `First block

Second block
`);
    const output = await renderCommand({
      file: fixturePath,
      format: "json",
      includePositions: true
    });
    const parsed = JSON.parse(output);
    const blocks = (parsed.content?.children || []).map((node) => node.position?.block);
    expect(blocks).toEqual([0, 1]);
  });
  test("supports xml backend", async () => {
    const output = await renderCommand({ file: fixturePath, format: "xml" });
    expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(output).toContain('<ast type="document">');
  });
  test("includes block attribute with --positions in xml", async () => {
    writeFileSync(fixturePath, `Alpha

Beta
`);
    const output = await renderCommand({
      file: fixturePath,
      format: "xml",
      includePositions: true
    });
    expect(output).toContain('block="0"');
    expect(output).toContain('block="1"');
  });
  test("supports html backend", async () => {
    writeFileSync(fixturePath, `Hello world
`);
    const output = await renderCommand({ file: fixturePath, format: "html" });
    expect(output).toContain("<!doctype html>");
    expect(output).toContain("<p>Hello world</p>");
  });
  test("supports body-only html rendering", async () => {
    const doc = parseFrontend(`Hello world
`, "texto");
    const output = renderBackend(doc, "html", { bodyOnly: true });
    expect(output).toBe("<p>Hello world</p>");
  });
  test("supports body-only html rendering through renderCommand", async () => {
    const output = await renderCommand({
      file: fixturePath,
      format: "html",
      bodyOnly: true
    });
    expect(output).toBe("<p>Hello world</p>");
  });
  test("parses strong inline markup inside tight list items", async () => {
    writeFileSync(fixturePath, `- It supports **markdown-like** syntax
`);
    const output = await renderCommand({ file: fixturePath, format: "html" });
    expect(output).toContain("<strong>markdown-like</strong>");
  });
  test("rejects unknown backend", async () => {
    await expect(renderCommand({ file: fixturePath, format: "wat" })).rejects.toThrow("Unknown output type");
  });
});
