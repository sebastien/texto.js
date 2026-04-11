// Unit tests for FencedBlockParser recognition

import { describe, test, expect } from "bun:test";
import { FencedBlockParser } from "../src/ts/texto/parsers/block/fenced";
import { ParsingContext } from "../src/ts/texto/parsing/context";
import { DocumentBuilder } from "../src/ts/texto/document/builder";
import { Cursor } from "../src/ts/texto/utils/cursor";

describe("FencedBlockParser recognition", () => {
	const createContext = (text: string): ParsingContext => {
		const builder = new DocumentBuilder();
		const context = new ParsingContext(builder, text);
		context.setText(text);
		context.setCurrentBlock(0, text.length);
		return context;
	};

	test("recognises simple fenced block", () => {
		const parser = new FencedBlockParser();
		const text = "```\ncode\n```";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).not.toBeNull();
		expect(info?.type).toBe("fenced");
		expect(info?.lang).toBe("");
	});

	test("recognises fenced block with language", () => {
		const parser = new FencedBlockParser();
		const text = "```javascript\ncode\n```";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).not.toBeNull();
		expect(info?.type).toBe("fenced");
		expect(info?.lang).toBe("javascript");
	});

	test("recognises fenced block with output annotation", () => {
		const parser = new FencedBlockParser();
		const text = "```python > output.py\ncode\n```";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).not.toBeNull();
		expect(info?.type).toBe("fenced");
		expect(info?.lang).toBe("python");
		expect(info?.output).toBe("output.py");
	});

	test("recognises fenced block with leading whitespace", () => {
		const parser = new FencedBlockParser();
		const text = "   ```\ncode\n   ```";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).not.toBeNull();
		expect(info?.type).toBe("fenced");
		expect(info?.indent).toBe(3);
	});

	test("recognises various language identifiers", () => {
		const parser = new FencedBlockParser();
		const languages = [
			"c",
			"cpp",
			"javascript",
			"typescript",
			"python",
			"rust",
			"go",
		];

		for (const lang of languages) {
			const text = "```" + lang + "\ncode\n```";
			const context = createContext(text);
			const cursor = new Cursor(text);

			const info = parser.recognises(cursor, context);

			expect(info).not.toBeNull();
			expect(info?.lang).toBe(lang);
		}
	});

	test("does not recognise incomplete fence", () => {
		const parser = new FencedBlockParser();
		const text = "``\ncode\n``";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).toBeNull();
	});

	test("does not recognise inline backticks", () => {
		const parser = new FencedBlockParser();
		const text = "```inline```";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).toBeNull();
	});

	test("does not recognise regular paragraph", () => {
		const parser = new FencedBlockParser();
		const text = "This is just a paragraph";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).toBeNull();
	});

	test("does not recognise section", () => {
		const parser = new FencedBlockParser();
		const text = "Section\n======";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).toBeNull();
	});

	test("handles empty language identifier", () => {
		const parser = new FencedBlockParser();
		const text = "```\njust text\n```";
		const context = createContext(text);
		const cursor = new Cursor(text);

		const info = parser.recognises(cursor, context);

		expect(info).not.toBeNull();
		expect(info?.lang).toBe("");
	});
});
