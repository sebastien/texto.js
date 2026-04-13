import { describe, expect, test } from "bun:test";
import {
	applyAstPatches,
	IncrementalParser,
	TextoParser,
	toJSON,
} from "../src/ts/texto/index";

describe("IncrementalParser", () => {
	test("init stores source and tree", () => {
		const source = "Hello\n\nWorld";
		const parser = new TextoParser();
		const incremental = new IncrementalParser();

		incremental.init(source);

		expect(incremental.source).toBe(source);
		expect(toJSON(incremental.tree, true)).toBe(
			toJSON(parser.parse(source), true),
		);
	});

	test("patch updates source, tree and returns patches", () => {
		const source = "Hello\n\nWorld";
		const nextSource = "Hello!\n\nWorld";
		const parser = new TextoParser();
		const incremental = new IncrementalParser(source, parser);

		const patches = incremental.patch({ offset: 5, length: 0, text: "!" });

		expect(incremental.source).toBe(nextSource);
		expect(toJSON(incremental.tree, true)).toBe(
			toJSON(parser.parse(nextSource), true),
		);

		const offsetPatch = patches.find(
			(patch) => patch.type === "UPDATE_OFFSETS",
		);
		expect(offsetPatch).toBeDefined();
		if (!offsetPatch || offsetPatch.type !== "UPDATE_OFFSETS") {
			throw new Error("missing UPDATE_OFFSETS patch");
		}

		expect(offsetPatch.delta).toBe(1);
		expect(offsetPatch.startOffset).toBe(5);
	});

	test("applyAstPatches can add and remove attributes", () => {
		const parser = new TextoParser();
		const tree = parser.parse("Hello");

		expect(tree.content.children.length).toBeGreaterThan(0);

		applyAstPatches(tree, [
			{ type: "UPDATE_ATTRIBUTE", path: [1, 0], key: "class", value: "edited" },
		]);
		expect(tree.content.children[0].attributes.get("class")).toBe("edited");

		applyAstPatches(tree, [
			{ type: "UPDATE_ATTRIBUTE", path: [1, 0], key: "class", value: null },
		]);
		expect(tree.content.children[0].attributes.get("class")).toBeUndefined();
	});

	test("patch uses local reparse without full parse", () => {
		const parser = new TextoParser();
		const originalParse = parser.parse.bind(parser);
		let parseCalls = 0;

		(
			parser as unknown as {
				parse: (input: string) => ReturnType<TextoParser["parse"]>;
			}
		).parse = (input: string) => {
			parseCalls += 1;
			return originalParse(input);
		};

		const incremental = new IncrementalParser("Hello\n\nWorld", parser);
		parseCalls = 0;

		incremental.patch({ offset: 5, length: 0, text: "!" });

		expect(parseCalls).toBe(0);
	});

	test("patch preserves structural block annotations", () => {
		const parser = new TextoParser();
		const incremental = new IncrementalParser("Hello\n\nWorld", parser);

		incremental.patch({ offset: 5, length: 0, text: "!" });

		expect(incremental.tree.content.attributes.get("block")).toBe("container");
		expect(incremental.tree.content.attributes.get("level")).toBe("0");

		for (const child of incremental.tree.content.children) {
			expect(child.attributes.get("block")).toBe("block");
			expect(child.attributes.get("level")).toBe("1");
		}
	});
});
