// Basic integration test for Texto parser

import { describe, test, expect } from "bun:test";
import { TextoParser } from "../src/ts/texto/texto";

describe("TextoParser", () => {
	test("parses simple paragraph", () => {
		const parser = new TextoParser();
		const doc = parser.parse("Hello world");

		expect(doc.type).toBe("document");
		expect(doc.content.children.length).toBeGreaterThan(0);
	});

	test("parses document structure", () => {
		const parser = new TextoParser();
		const doc = parser.parse("Para 1\n\nPara 2");

		expect(doc.type).toBe("document");
		expect(doc.content).toBeDefined();
		expect(doc.header).toBeDefined();
		expect(doc.references).toBeDefined();
		expect(doc.appendices).toBeDefined();
	});

	test("parses section heading", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
Section Title
=============

Content here.
`);

		expect(doc.content.children.length).toBeGreaterThan(0);
	});

	test("parses unordered list", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
- Item 1
- Item 2
- Item 3
`);

		expect(doc.content.children.length).toBeGreaterThan(0);
	});

	test("parses numbered list", () => {
		const parser = new TextoParser();
		const doc = parser.parse(`
1) First
2) Second
3) Third
`);

		expect(doc.content.children.length).toBeGreaterThan(0);
	});

	test("creates proper document tree", () => {
		const parser = new TextoParser();
		const doc = parser.parse("# Title\n\nSome content");

		// Verify basic structure
		expect(doc.type).toBe("document");
		expect(doc.content.type).toBe("element");
		expect(doc.content.name).toBe("content");
	});
});
