// Integration tests for format preservation in pre blocks

import { describe, test, expect } from "bun:test";
import { TextoParser } from "../ts/texto/texto";
import { formatTexto } from "../ts/texto/formatters/texto";

describe("Pre block format preservation", () => {
	test("fenced block preserves format as fenced", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`
code here
\`\`\`
`);

		// Find the pre element
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

		const pre = findPre(doc.content);
		expect(pre).not.toBeNull();
		expect(pre.attributes.get("_format")).toBe("fenced");
	});

	test("indented block preserves format as indented", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
>   code here
>   more code
`);

		// Find the pre element
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

		const pre = findPre(doc.content);
		expect(pre).not.toBeNull();
		expect(pre.attributes.get("_format")).toBe("indented");
	});

	test("formatter outputs fenced by default for new content", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`
code
\`\`\`
`);

		const formatted = formatTexto(doc);

		// Should use fenced format
		expect(formatted).toContain("```");
		expect(formatted).not.toContain(">   ");
	});

	test("formatter outputs indented for indented input", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
>   code here
>   more code
`);

		const formatted = formatTexto(doc);

		// Should preserve indented format
		expect(formatted).toContain(">   ");
	});

	test("round-trip preserves fenced format", () => {
		const parser = new TextoParser();
		const input = `
\`\`\`
code here
\`\`\`
`;

		const doc1 = parser.parse(input);
		const formatted1 = formatTexto(doc1);

		const doc2 = parser.parse(formatted1);
		const formatted2 = formatTexto(doc2);

		// Both should use fenced format
		expect(formatted1).toContain("```");
		expect(formatted2).toContain("```");

		// Content should be preserved
		expect(formatted2).toContain("code here");
	});

	test("round-trip preserves indented format", () => {
		const parser = new TextoParser();
		const input = `
>   code here
>   more code
`;

		const doc1 = parser.parse(input);
		const formatted1 = formatTexto(doc1);

		const doc2 = parser.parse(formatted1);
		const formatted2 = formatTexto(doc2);

		// Both should use indented format
		expect(formatted1).toContain(">   ");
		expect(formatted2).toContain(">   ");

		// Content should be preserved
		expect(formatted2).toContain("code here");
	});

	test("formatter outputs fenced with language", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`javascript
const x = 1;
\`\`\`
`);

		const formatted = formatTexto(doc);

		// Should include language
		expect(formatted).toContain("```javascript");
	});

	test("formatter outputs fenced with output annotation", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`python > script.py
print("hello")
\`\`\`
`);

		const formatted = formatTexto(doc);

		// Should include output annotation
		expect(formatted).toContain("```python > script.py");
	});

	test("formatter prefers fenced for content with lang", () => {
		// Even if format was indented, if lang is present, use fenced
		const parser = new TextoParser();
		const doc = parser.parse(`
\`\`\`rust
fn main() {}
\`\`\`
`);

		const formatted = formatTexto(doc);

		expect(formatted).toContain("```rust");
		expect(formatted).toContain("fn main()");
	});
});
