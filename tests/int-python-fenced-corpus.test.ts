// Test parsing the Python test fixture for fenced blocks

import { describe, test, expect } from "bun:test";
import { TextoParser } from "../src/ts/texto/texto";
import { readFileSync } from "fs";
import { join } from "path";

describe("Python corpus fenced block test", () => {
	test("parses syntax-preformatted-block.txto", () => {
		const filePath = join(
			import.meta.dirname,
			"data",
			"syntax-preformatted-block.txto",
		);
		const content = readFileSync(filePath, "utf8");

		const parser = new TextoParser();
		const doc = parser.parse(content);

		// Find all pre elements recursively
		const findPreElements = (node: any): any[] => {
			const results: any[] = [];
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

		// Should find 3 fenced blocks:
		// 1. Simple block with no language
		// 2. C code block
		// 3. Scheme block with output annotation
		expect(preElements.length).toBe(3);

		// First block has no language
		expect(preElements[0].attributes.get("data-lang")).toBeFalsy();

		// Second block is C
		expect(preElements[1].attributes.get("data-lang")).toBe("c");

		// Third block is scheme with output file
		expect(preElements[2].attributes.get("data-lang")).toBe("scheme");
		expect(preElements[2].attributes.get("data-output")).toBe(
			"examples/account.ss",
		);

		// Verify C block content
		const cContent = preElements[1].children[0]?.content || "";
		expect(cContent).toContain("typedef struct ParsingContext");
		expect(cContent).toContain("struct Grammar*");
	});
});
