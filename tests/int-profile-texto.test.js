import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderCommand } from "../src/js/texto/cli/index.js";
describe("texto profile syntax", () => {
  let tempDir;
  let fixturePath;
  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "texto-profile-"));
    fixturePath = join(tempDir, "profile.txto");
  });
  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
  async function renderTextoHTML(input) {
    writeFileSync(fixturePath, input);
    return renderCommand({
      file: fixturePath,
      profile: "texto",
      format: "html"
    });
  }
  async function parseTextoJSON(input) {
    writeFileSync(fixturePath, input);
    const output = await renderCommand({
      file: fixturePath,
      profile: "texto",
      format: "json"
    });
    return JSON.parse(output);
  }
  test("parses plain paragraph", async () => {
    const output = await renderTextoHTML(`Hello world
`);
    expect(output).toContain("<p>Hello world</p>");
  });
  test("parses emphasis", async () => {
    const output = await renderTextoHTML(`This is *important*.
`);
    expect(output).toContain("<em>important</em>");
  });
  test("parses inline code with backticks", async () => {
    const output = await renderTextoHTML("Use `texto parse` here.\n");
    expect(output).toContain("<code>texto parse</code>");
  });
  test("parses inline code with multi-backtick delimiters", async () => {
    const output = await renderTextoHTML("Use ``cmd `--flag` run`` in docs.\n");
    expect(output).toContain("<code>cmd `--flag` run</code>");
  });
  test("parses unordered lists", async () => {
    const output = await renderTextoHTML(`- Item 1
- Item 2
`);
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>Item 1</li>");
    expect(output).toContain("<li>Item 2</li>");
  });
  test("parses ordered lists", async () => {
    const output = await renderTextoHTML(`1) First
2) Second
`);
    expect(output).toContain("<ol>");
    expect(output).toContain("<li>First</li>");
    expect(output).toContain("<li>Second</li>");
  });
  test("parses markdown-style inline links", async () => {
    const output = await renderTextoHTML(`Visit [Texto](https://example.com).
`);
    expect(output).toContain('<a href="https://example.com">Texto</a>');
  });
  test("parses automatic links", async () => {
    const output = await renderTextoHTML(`Homepage: <https://example.com>
`);
    expect(output).toContain('<a href="https://example.com">https://example.com</a>');
  });
  test("parses reference links", async () => {
    const output = await renderTextoHTML(`Visit [Texto][docs].

[docs]: https://example.com/docs
`);
    expect(output).toContain('<a href="https://example.com/docs">Texto</a>');
  });
  test("parses collapsed reference links", async () => {
    const output = await renderTextoHTML(`Visit [docs].

[docs]: https://example.com/docs
`);
    expect(output).toContain('<a href="https://example.com/docs">docs</a>');
  });
  test("parses github-style checklist markers", async () => {
    const output = await parseTextoJSON(`- [ ] todo
* [x] done
+ [X] shipped
`);
    const list = output.content.children.find((child) => child.name === "list" && child.attributes?.type === "todo");
    expect(list).toBeDefined();
    expect(list?.children?.[0]?.attributes?.todo).toBe("true");
    expect(list?.children?.[1]?.attributes?.todo).toBe("done");
    expect(list?.children?.[2]?.attributes?.todo).toBe("done");
  });
  test("does not parse bare bracket markers as checklist", async () => {
    const output = await renderTextoHTML(`[x] not a checklist
[ ] neither
`);
    expect(output).not.toContain('<ul class="checklist">');
    expect(output).not.toContain('type="checkbox"');
    expect(output).toContain("[x] not a checklist");
    expect(output).toContain("[ ] neither");
  });
});
