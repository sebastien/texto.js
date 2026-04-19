import { describe, expect, test } from "bun:test";
import { createMarkdownParser } from "../src/ts/texto/profiles/markdown";
import { TextoParser } from "../src/ts/texto/texto";

describe("block positions", () => {
	test("texto section title spans heading prefix and trailing newline", () => {
		const input = "# Intro\n\nBody\n";
		const parser = new TextoParser();
		const doc = parser.parse(input);

		const section = doc.content.children.find(
			(node) => node.type === "element" && node.name === "section",
		);
		expect(section).toBeDefined();
		if (!section || section.type !== "element") {
			throw new Error("expected section node");
		}

		const title = section.children.find(
			(node) => node.type === "element" && node.name === "title",
		);
		expect(title).toBeDefined();
		if (!title || title.type !== "element" || !title.position) {
			throw new Error("expected title node with position");
		}

		expect(input.slice(title.position.start, title.position.end)).toBe(
			"# Intro\n",
		);
	});

	test("markdown headings span heading prefix and trailing newline", () => {
		const input = "## Intro\n\nBody\n";
		const parser = createMarkdownParser();
		const doc = parser.parse(input);

		const heading = doc.content.children.find(
			(node) => node.type === "element" && node.name === "h2",
		);
		expect(heading).toBeDefined();
		if (!heading || heading.type !== "element" || !heading.position) {
			throw new Error("expected heading node with position");
		}

		expect(input.slice(heading.position.start, heading.position.end)).toBe(
			"## Intro\n",
		);
	});

	test("list items span the full source line", () => {
		const input = "- First\n- Second";
		const markdownDoc = createMarkdownParser().parse(input);
		const textoDoc = new TextoParser().parse(input);

		for (const doc of [markdownDoc, textoDoc]) {
			const list = doc.content.children.find(
				(node) => node.type === "element" && node.name === "list",
			);
			expect(list).toBeDefined();
			if (!list || list.type !== "element") {
				throw new Error("expected list node");
			}

			const firstItem = list.children[0];
			const secondItem = list.children[1];
			if (
				!firstItem ||
				firstItem.type !== "element" ||
				!firstItem.position ||
				!secondItem ||
				secondItem.type !== "element" ||
				!secondItem.position
			) {
				throw new Error("expected list items with positions");
			}

			expect(
				input.slice(firstItem.position.start, firstItem.position.end),
			).toBe("- First\n");
			expect(
				input.slice(secondItem.position.start, secondItem.position.end),
			).toBe("- Second");
		}
	});
});
