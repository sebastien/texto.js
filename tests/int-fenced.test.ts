// Integration tests for fenced block parsing

import { describe, test, expect } from "bun:test";
import { TextoParser } from "../ts/texto/texto";
import { formatJSON } from "../ts/texto/formatters/json";

describe("Fenced block parsing", () => {
	test("parses simple fenced block", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
Normal text

\`\`\`
Code here
\`\`\`

More text
`);

		// Find the pre element
		const content = doc.content;
		const preElements = content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(1);
		expect(preElements[0].children.length).toBe(1);
		expect(preElements[0].children[0].content).toBe("Code here");
	});

	test("parses fenced block with language", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`
`);

		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(1);
		expect(preElements[0].attributes.get("data-lang")).toBe("javascript");
	});

	test("parses fenced block with output annotation", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`python > script.py
print("hello")
\`\`\`
`);

		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(1);
		expect(preElements[0].attributes.get("data-lang")).toBe("python");
		expect(preElements[0].attributes.get("data-output")).toBe("script.py");
	});

	test("parses fenced block with empty content", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`
\`\`\`
`);

		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(1);
	});

	test("parses multiple fenced blocks", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`python
print(1)
\`\`\`

\`\`\`javascript
console.log(2);
\`\`\`
`);

		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(2);
		expect(preElements[0].attributes.get("data-lang")).toBe("python");
		expect(preElements[1].attributes.get("data-lang")).toBe("javascript");
	});

	test("handles indented fenced block", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
   \`\`\`
   indented code
   more code
   \`\`\`
`);

		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(1);
		// Content should be normalized (indentation removed)
		const content = preElements[0].children[0]?.content || "";
		expect(content).toContain("indented code");
	});

	test("handles fenced block with empty lines in content", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`
line 1

line 2
\`\`\`
`);

		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(1);
		const content = preElements[0].children[0]?.content || "";
		expect(content).toContain("line 1");
		expect(content).toContain("line 2");
	});

	test("handles fenced block with special characters", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`
<code>
  <div>Test</div>
</code>
\`\`\`
`);

		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		expect(preElements.length).toBe(1);
		const content = preElements[0].children[0]?.content || "";
		expect(content).toContain("<code>");
	});

	test("strict mode: treats unclosed fenced block as paragraph", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`
unclosed code block
`);

		// In strict mode, unclosed blocks should be treated as paragraphs
		const preElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "pre",
		);

		// Should not create a pre element for unclosed block
		expect(preElements.length).toBe(0);

		// Should have a paragraph instead
		const pElements = doc.content.children.filter(
			(child: { tagName: string }) => child.tagName === "p",
		);

		expect(pElements.length).toBeGreaterThan(0);
	});

	test("handles fenced block in document context", () => {
		const parser = new TextoParser();
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

		// Find pre elements at any depth (fenced block is inside section)
		const findPreElements = (node: any): any[] => {
			const results: any[] = [];
			if (node.tagName === "pre") {
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

		// Verify surrounding content is parsed (section with children)
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
			"kotlin",
		];

		for (const lang of languages) {
			const parser = new TextoParser();
			const doc = parser.parse(`
\`\`\`${lang}
code
\`\`\`
`);

			const preElements = doc.content.children.filter(
				(child: { tagName: string }) => child.tagName === "pre",
			);

			expect(preElements.length).toBe(1);
			expect(preElements[0].attributes.get("data-lang")).toBe(lang);
		}
	});

	test("formats to JSON correctly", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`typescript
const x: number = 42;
\`\`\`
`);

		const json = formatJSON(doc);
		const parsed = JSON.parse(json);

		expect(parsed.type).toBe("document");

		// Find pre element in content
		const findPre = (node: any): any => {
			if (node.tagName === "pre") return node;
			if (node.children) {
				for (const child of node.children) {
					const found = findPre(child);
					if (found) return found;
				}
			}
			return null;
		};

		const preElement = findPre(parsed.content);
		expect(preElement).not.toBeNull();
		expect(preElement.attributes["data-lang"]).toBe("typescript");
	});
});
