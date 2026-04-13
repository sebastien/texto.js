import { describe, expect, test } from "bun:test";
import { TextoParser } from "../src/ts/texto/texto";

describe("block structural attributes", () => {
	test("annotates containers and direct blocks with level", () => {
		const parser = new TextoParser();
		const doc = parser.parse("Intro\n\nSection Title\n=============\n\nBody\n");

		expect(doc.content.attributes.get("block")).toBe("container");
		expect(doc.content.attributes.get("level")).toBe("0");

		const intro = doc.content.children[0];
		expect(intro.attributes.get("block")).toBe("block");
		expect(intro.attributes.get("level")).toBe("1");

		const section = doc.content.children.find(
			(node) => node.type === "element" && node.name === "section",
		);
		expect(section).toBeDefined();
		if (!section) {
			throw new Error("expected section node");
		}

		expect(section.attributes.get("block")).toBe("container");
		expect(section.attributes.get("level")).toBe("1");

		const title = section.children.find(
			(node) => node.type === "element" && node.name === "title",
		);
		expect(title).toBeDefined();
		if (!title) {
			throw new Error("expected title node");
		}

		expect(title.attributes.get("block")).toBe("block");
		expect(title.attributes.get("level")).toBe("2");

		const titleText = title.children[0];
		expect(titleText.attributes.get("block")).toBeUndefined();
		expect(titleText.attributes.get("level")).toBeUndefined();

		const sectionContent = section.children.find(
			(node) => node.type === "element" && node.name === "content",
		);
		expect(sectionContent).toBeDefined();
		if (!sectionContent) {
			throw new Error("expected section content node");
		}

		expect(sectionContent.attributes.get("block")).toBe("container");
		expect(sectionContent.attributes.get("level")).toBe("2");

		const body = sectionContent.children.find(
			(node) => node.type === "element" && node.name === "p",
		);
		expect(body).toBeDefined();
		if (!body) {
			throw new Error("expected body paragraph");
		}

		expect(body.attributes.get("block")).toBe("block");
		expect(body.attributes.get("level")).toBe("3");
	});
});
