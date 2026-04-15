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

function createRng(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

function mutate(source: string, rand: () => number): string {
	if (source.length === 0) {
		return "X";
	}
	const mode = Math.floor(rand() * 3);
	const start = Math.floor(rand() * (source.length + 1));
	const end = Math.floor(start + rand() * (source.length - start));

	if (mode === 0) {
		const token = rand() < 0.5 ? "\n" : rand() < 0.75 ? "- X\n" : "X";
		return `${source.slice(0, start)}${token}${source.slice(start)}`;
	}

	if (mode === 1) {
		if (start === end) {
			return source;
		}
		return `${source.slice(0, start)}${source.slice(end)}`;
	}

	const token = rand() < 0.4 ? "\n" : rand() < 0.7 ? "X" : "- item\n";
	return `${source.slice(0, start)}${token}${source.slice(end)}`;
}

function stripIds(node: unknown): unknown {
	if (!node || typeof node !== "object") {
		return node;
	}
	if (Array.isArray(node)) {
		return node.map(stripIds);
	}
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		if (key === "id") {
			continue;
		}
		out[key] = stripIds(value);
	}
	return out;
}

const ENABLE_STRESS =
	typeof process !== "undefined" &&
	process.env.TEXTO_INCREMENTAL_STRESS === "1";

describe("incremental parity randomized smoke", () => {
	test.skipIf(!ENABLE_STRESS)(
		"random small edits stay in sync with full parser (stress opt-in)",
		() => {
			const parser = new TextoParser();
			const incremental = new IncrementalParser(BASE, parser);
			const rand = createRng(0x5eed1234);
			let current = BASE;

			for (let i = 0; i < 75; i += 1) {
				const next = mutate(current, rand);
				const edits = delta(current, next);
				incremental.patch(edits);

				const full = parser.parse(next);
				const incJson = stripIds(JSON.parse(toJSON(incremental.tree, true)));
				const fullJson = stripIds(JSON.parse(toJSON(full, true)));
				expect(JSON.stringify(incJson), `iteration ${i}`).toBe(
					JSON.stringify(fullJson),
				);
				current = next;
			}
		},
	);
});
