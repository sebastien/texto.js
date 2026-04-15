import { describe, expect, test } from "bun:test";
import {
	IncrementalParser,
	TextoParser,
	delta,
	toJSON,
} from "../src/ts/texto/index";

const BASE = `
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

describe("IncrementalParser fallback behavior", () => {
	test("newline insertion at list/section boundary preserves downstream blocks", () => {
		const next = BASE.replace(
			"- It can be edited in-place\n\n## Features",
			"- It can be edited in-place\n\n\n## Features",
		);
		const parser = new TextoParser();
		const incremental = new IncrementalParser(BASE, parser);

		incremental.patch(delta(BASE, next));

		const full = parser.parse(next);
		expect(toJSON(incremental.tree, true)).toBe(toJSON(full, true));
	});

	test("fallback parity holds across repeated boundary edits", () => {
		const parser = new TextoParser();
		const incremental = new IncrementalParser(BASE, parser);

		const s1 = BASE.replace(
			"- It can be edited in-place\n\n## Features",
			"- It can be edited in-place\n\n\n## Features",
		);
		const s2 = s1.replace("\n## Features", "\n- XXX\n\n## Features");

		incremental.patch(delta(BASE, s1));
		expect(toJSON(incremental.tree, true)).toBe(toJSON(parser.parse(s1), true));

		incremental.patch(delta(s1, s2));
		expect(toJSON(incremental.tree, true)).toBe(toJSON(parser.parse(s2), true));
	});
});
