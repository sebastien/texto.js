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

type Mutation = {
	next: string;
	hintStart: number;
	hintEnd: number;
};

type MismatchCategory = "position-only" | "metadata-only" | "structural";

type Mismatch = {
	category: MismatchCategory;
	base: string;
	seed: number;
	iteration: number;
	currentLength: number;
	nextLength: number;
	edits: string;
	hints: [number, number];
	incNodes: number;
	fullNodes: number;
};

const BASES = [
	{
		name: "wiki-lists-sections",
		source: BASE,
	},
	{
		name: "short-heading-paragraph",
		source: `
# Intro

Hello world.
`,
	},
	{
		name: "mixed-list-inline",
		source: `
# Tasks

- One *item*
- Two **items**

Done.
`,
	},
];

const SEEDS = [0x5eed1234, 0xdecafbad, 0x12345678, 0x0badf00d];

function mutate(source: string, rand: () => number): Mutation {
	if (source.length === 0) {
		return { next: "X", hintStart: 0, hintEnd: 0 };
	}
	const mode = Math.floor(rand() * 4);
	const start = Math.floor(rand() * (source.length + 1));
	const end = Math.floor(start + rand() * (source.length - start));

	if (mode === 0) {
		const token = rand() < 0.5 ? "\n" : rand() < 0.75 ? "- X\n" : "X";
		return {
			next: `${source.slice(0, start)}${token}${source.slice(start)}`,
			hintStart: start,
			hintEnd: start,
		};
	}

	if (mode === 1) {
		if (start === end) {
			return { next: source, hintStart: start, hintEnd: end };
		}
		return {
			next: `${source.slice(0, start)}${source.slice(end)}`,
			hintStart: start,
			hintEnd: end,
		};
	}

	if (mode === 2) {
		const token = rand() < 0.4 ? "\n" : rand() < 0.7 ? "X" : "- item\n";
		return {
			next: `${source.slice(0, start)}${token}${source.slice(end)}`,
			hintStart: start,
			hintEnd: end,
		};
	}

	const boundary = source.indexOf("\n\n");
	const pivot = boundary >= 0 ? boundary + 1 : Math.floor(source.length / 2);
	const token = rand() < 0.5 ? "\n" : "\n- item\n";
	return {
		next: `${source.slice(0, pivot)}${token}${source.slice(pivot)}`,
		hintStart: pivot,
		hintEnd: pivot,
	};
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

function stripPositions(node: unknown): unknown {
	if (!node || typeof node !== "object") {
		return node;
	}
	if (Array.isArray(node)) {
		return node.map(stripPositions);
	}
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		if (key === "position") {
			continue;
		}
		out[key] = stripPositions(value);
	}
	return out;
}

function projectShape(node: unknown): unknown {
	if (!node || typeof node !== "object") {
		return node;
	}
	if (Array.isArray(node)) {
		return node.map(projectShape);
	}
	const value = node as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	if (typeof value.type === "string") {
		out.type = value.type;
	}
	if (typeof value.name === "string") {
		out.name = value.name;
	}
	if (typeof value.content === "string") {
		out.content = value.content;
	}
	if (Array.isArray(value.children)) {
		out.children = value.children.map(projectShape);
	}
	return out;
}

function countNodes(node: unknown): number {
	if (!node || typeof node !== "object") {
		return 0;
	}
	if (Array.isArray(node)) {
		let total = 0;
		for (const child of node) {
			total += countNodes(child);
		}
		return total;
	}
	const current = node as Record<string, unknown>;
	let total = typeof current.type === "string" ? 1 : 0;
	if (Array.isArray(current.children)) {
		for (const child of current.children) {
			total += countNodes(child);
		}
	}
	return total;
}

function classifyMismatch(inc: unknown, full: unknown): MismatchCategory {
	const incNoPos = stripPositions(inc);
	const fullNoPos = stripPositions(full);
	if (JSON.stringify(incNoPos) === JSON.stringify(fullNoPos)) {
		return "position-only";
	}
	const incShape = projectShape(incNoPos);
	const fullShape = projectShape(fullNoPos);
	if (JSON.stringify(incShape) === JSON.stringify(fullShape)) {
		return "metadata-only";
	}
	return "structural";
}

const ENABLE_STRESS =
	typeof process !== "undefined" &&
	process.env.TEXTO_INCREMENTAL_STRESS === "1";

describe("incremental parity randomized smoke", () => {
	test.skipIf(!ENABLE_STRESS)(
		"random small edits stay in sync with full parser (stress opt-in)",
		() => {
			const parser = new TextoParser();
			const mismatches: Mismatch[] = [];

			for (const base of BASES) {
				for (const seed of SEEDS) {
					const rand = createRng(seed);
					const incremental = new IncrementalParser(base.source, parser);
					let current = base.source;

					for (let i = 0; i < 90; i += 1) {
						const mutation = mutate(current, rand);
						const useHints = rand() < 0.65;
						const edits = useHints
							? delta(
									current,
									mutation.next,
									mutation.hintStart,
									mutation.hintEnd,
								)
							: delta(current, mutation.next);
						incremental.patch(edits);

						const full = parser.parse(mutation.next);
						const incJson = stripIds(
							JSON.parse(toJSON(incremental.tree, true)),
						);
						const fullJson = stripIds(JSON.parse(toJSON(full, true)));
						if (JSON.stringify(incJson) !== JSON.stringify(fullJson)) {
							mismatches.push({
								category: classifyMismatch(incJson, fullJson),
								base: base.name,
								seed,
								iteration: i,
								currentLength: current.length,
								nextLength: mutation.next.length,
								edits: JSON.stringify(edits),
								hints: [mutation.hintStart, mutation.hintEnd],
								incNodes: countNodes(incJson),
								fullNodes: countNodes(fullJson),
							});
						}
						current = mutation.next;
					}
				}
			}

			const counts = {
				"position-only": 0,
				"metadata-only": 0,
				structural: 0,
			};
			for (const mismatch of mismatches) {
				counts[mismatch.category] += 1;
			}

			if (mismatches.length > 0) {
				const sample = mismatches
					.slice(0, 12)
					.map(
						(mismatch) =>
							`${mismatch.category} base=${mismatch.base} seed=${mismatch.seed} i=${mismatch.iteration} len=${mismatch.currentLength}->${mismatch.nextLength} nodes=${mismatch.incNodes}/${mismatch.fullNodes} hints=${mismatch.hints[0]}-${mismatch.hints[1]} edits=${mismatch.edits}`,
					)
					.join("\n");
				const summary = [
					`Incremental parity mismatches: ${mismatches.length}`,
					`Breakdown: position-only=${counts["position-only"]}, metadata-only=${counts["metadata-only"]}, structural=${counts.structural}`,
					"Sample mismatches:",
					sample,
				].join("\n");
				if (counts.structural > 0) {
					throw new Error(summary);
				}
				console.warn(`[texto][incremental-stress] ${summary}`);
			}

			expect(counts.structural).toBe(0);
		},
	);
});
