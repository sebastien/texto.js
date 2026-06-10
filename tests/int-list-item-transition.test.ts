import { describe, expect, test } from "bun:test";
import { IncrementalParser, TextoParser, delta } from "../src/ts/texto/index";

const INITIAL_SOURCE = `
# Hello World

This is a *texto* document

- It supports **markdown-like** syntax
- It can be edited in-place

## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`;

const AFTER_BLANK_LINE = `
# Hello World

This is a *texto* document

- It supports **markdown-like** syntax
- It can be edited in-place


## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`;

const AFTER_NEW_ITEM = `
# Hello World

This is a *texto* document

- It supports **markdown-like** syntax
- It can be edited in-place
- XXX

## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`;

const walk = (node, visitor) => {
	if (!node || typeof node !== "object") {
		return;
	}
	visitor(node);
	for (const child of node.children || []) {
		walk(child, visitor);
	}
};

const firstList = (document) => {
	let list;
	walk(document?.content, (node) => {
		if (!list && node?.type === "element" && node?.name === "list") {
			list = node;
		}
	});
	return list;
};

const assertNoMixedTextAndParagraphChildren = (document) => {
	const list = firstList(document);
	expect(list).toBeDefined();

	for (const item of list.children || []) {
		if (item?.type !== "element" || item?.name !== "item") {
			continue;
		}
		const hasText = (item.children || []).some(
			(child) => child?.type === "text",
		);
		const hasParagraph = (item.children || []).some(
			(child) => child?.type === "element" && child?.name === "paragraph",
		);
		expect(hasText && hasParagraph).toBe(false);
	}
};

describe("list item transition", () => {
	test("full parser keeps stable list item child shapes across edit states", () => {
		const parser = new TextoParser();
		const states = [INITIAL_SOURCE, AFTER_BLANK_LINE, AFTER_NEW_ITEM];

		for (const source of states) {
			const doc = parser.parse(source);
			assertNoMixedTextAndParagraphChildren(doc);
		}
	});

	test("incremental parser matches full parse and avoids mixed item children", () => {
		const parser = new TextoParser();
		const incremental = new IncrementalParser(INITIAL_SOURCE, parser);
		const states = [AFTER_BLANK_LINE, AFTER_NEW_ITEM];

		for (const nextSource of states) {
			const edits = delta(incremental.source, nextSource);
			incremental.patch(edits);

			const expected = parser.parse(nextSource);
			expect(incremental.source).toBe(nextSource);
			expect(JSON.stringify(incremental.tree)).toBe(JSON.stringify(expected));
			assertNoMixedTextAndParagraphChildren(incremental.tree);
		}
	});
});
