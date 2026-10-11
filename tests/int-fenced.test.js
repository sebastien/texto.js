import { describe, test, expect } from "bun:test";
import { TextoParser } from "../src/js/texto/texto.js";
import { formatJSON } from "../src/js/texto/backends/json.js";
describe("Fenced block parsing", () => {
  test("parses simple fenced block", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
Normal text

\`\`\`
Code here
\`\`\`

More text
`);
    const content = doc.content;
    const preElements = content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(1);
    expect(preElements[0].children.length).toBe(1);
    expect(preElements[0].children[0].content).toBe("Code here");
  });
  test("parses fenced block with language", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(1);
    expect(preElements[0].attributes.get("data-lang")).toBe("javascript");
  });
  test("parses fenced block with output annotation", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`python > script.py
print("hello")
\`\`\`
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(1);
    expect(preElements[0].attributes.get("data-lang")).toBe("python");
    expect(preElements[0].attributes.get("data-output")).toBe("script.py");
  });
  test("parses fenced block with empty content", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`
\`\`\`
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(1);
  });
  test("parses multiple fenced blocks", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`python
print(1)
\`\`\`

\`\`\`javascript
console.log(2);
\`\`\`
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(2);
    expect(preElements[0].attributes.get("data-lang")).toBe("python");
    expect(preElements[1].attributes.get("data-lang")).toBe("javascript");
  });
  test("handles indented fenced block", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
   \`\`\`
   indented code
   more code
   \`\`\`
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(1);
    const content = preElements[0].children[0]?.content || "";
    expect(content).toContain("indented code");
  });
  test("handles fenced block with empty lines in content", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`
line 1

line 2
\`\`\`
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(1);
    const content = preElements[0].children[0]?.content || "";
    expect(content).toContain("line 1");
    expect(content).toContain("line 2");
  });
  test("handles fenced block with special characters", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`
<code>
  <div>Test</div>
</code>
\`\`\`
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(1);
    const content = preElements[0].children[0]?.content || "";
    expect(content).toContain("<code>");
  });
  test("strict mode: treats unclosed fenced block as paragraph", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`
unclosed code block
`);
    const preElements = doc.content.children.filter((child) => child.name === "preformatted");
    expect(preElements.length).toBe(0);
    const pElements = doc.content.children.filter((child) => child.name === "paragraph");
    expect(pElements.length).toBeGreaterThan(0);
  });
  test("handles fenced block in document context", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
# Title

Some intro text.

\`\`\`c
int main() {
    return 0;
}
\`\`\`

Conclusion paragraph.
`);
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
    expect(preElements.length).toBe(1);
    expect(preElements[0].attributes.get("data-lang")).toBe("c");
    expect(doc.content.children.length).toBeGreaterThan(0);
  });
  test("handles various language identifiers", () => {
    const languages = [
      "c",
      "cpp",
      "javascript",
      "typescript",
      "python",
      "rust",
      "go",
      "java",
      "ruby",
      "php",
      "swift",
      "kotlin"
    ];
    for (const lang of languages) {
      const parser = new TextoParser;
      const doc = parser.parse(`
\`\`\`${lang}
code
\`\`\`
`);
      const preElements = doc.content.children.filter((child) => child.name === "preformatted");
      expect(preElements.length).toBe(1);
      expect(preElements[0].attributes.get("data-lang")).toBe(lang);
    }
  });
  test("formats to JSON correctly", () => {
    const parser = new TextoParser;
    const doc = parser.parse(`
\`\`\`typescript
const x: number = 42;
\`\`\`
`);
    const json = formatJSON(doc);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("document");
    const findPre = (node) => {
      if (node.name === "preformatted")
        return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findPre(child);
          if (found)
            return found;
        }
      }
      return null;
    };
    const preElement = findPre(parsed.content);
    expect(preElement).not.toBeNull();
    expect(preElement.attributes["data-lang"]).toBe("typescript");
  });
});
