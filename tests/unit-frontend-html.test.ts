import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	Document as DOMDocument,
	type Element as DOMElement,
} from "../deps/domish.js/src/ts/domish/domish";
import { main } from "../src/ts/texto/cli/index";
import {
	DefaultNodeFactory,
	FrontEndProcessor,
	htmlToDocument,
	htmlToTexto,
} from "../src/ts/texto/frontends/html";
import { TextoParser } from "../src/ts/texto/index";

describe("HTML frontend", () => {
	describe("DefaultNodeFactory", () => {
		test("creates semantic Texto nodes", () => {
			const factory = new DefaultNodeFactory();
			const section = factory.section(2);
			const list = factory.list("unordered");
			const pre = factory.preformatted("js");

			expect(section.type).toBe("element");
			expect(section.name).toBe("section");
			expect(section.attributes.get("depth")).toBe("2");

			expect(list.name).toBe("list");
			expect(list.attributes.get("type")).toBe("unordered");

			expect(pre.name).toBe("preformatted");
			expect(pre.attributes.get("data-lang")).toBe("js");
		});

		test("unknown produces markup node", () => {
			const factory = new DefaultNodeFactory();
			const node = factory.unknown("custom", { class: "x" });
			expect(node.name).toBe("markup");
			expect(node.attributes.get("tag")).toBe("custom");
			expect(node.attributes.get("class")).toBe("x");
		});
	});

	describe("FrontEndProcessor", () => {
		test("converts headings and paragraphs", () => {
			const doc = htmlToDocument("<h1>Title</h1><p>Hello world</p>");
			expect(doc.content.children.length).toBe(1);

			const section = doc.content.children[0];
			expect(section.name).toBe("section");
			expect(section.attributes.get("depth")).toBe("1");

			const title = section.children.find((c) => c.name === "title");
			expect(title).toBeDefined();
			expect(title?.children[0]?.type).toBe("text");
			expect(title?.children[0]?.content).toBe("Title");

			const content = section.children.find((c) => c.name === "content");
			expect(content?.children[0]?.name).toBe("paragraph");
		});

		test("groups siblings under sections until next heading", () => {
			const html =
				"<h1>A</h1><p>one</p><h2>B</h2><p>two</p><p>three</p><h1>C</h1><p>four</p>";
			const doc = htmlToDocument(html);
			const top = doc.content.children;
			expect(top.length).toBe(2);
			expect(top[0]?.name).toBe("section");
			expect(top[1]?.name).toBe("section");

			const aContent = top[0]?.children.find((c) => c.name === "content");
			expect(aContent?.children.length).toBe(2);
			expect(aContent?.children[0]?.name).toBe("paragraph");
			expect(aContent?.children[1]?.name).toBe("section");

			const bContent = aContent?.children[1]?.children.find(
				(c) => c.name === "content",
			);
			expect(bContent?.children.length).toBe(2);
			expect(bContent?.children.every((c) => c.name === "paragraph")).toBe(
				true,
			);
		});

		test("converts unordered and ordered lists", () => {
			const doc = htmlToDocument("<ul><li>first</li><li>second</li></ul>");
			const list = doc.content.children[0];
			expect(list?.name).toBe("list");
			expect(list?.attributes.get("type")).toBe("unordered");
			expect(list?.children.length).toBe(2);
			expect(list?.children.every((c) => c.name === "item")).toBe(true);
		});

		test("converts definition lists", () => {
			const doc = htmlToDocument("<dl><dt>term</dt><dd>definition</dd></dl>");
			const list = doc.content.children[0];
			expect(list?.name).toBe("list");
			expect(list?.attributes.get("type")).toBe("definition");
			const item = list?.children[0];
			expect(item?.name).toBe("item");
			expect(item?.children[0]?.name).toBe("term");
			expect(item?.children[1]?.name).toBe("definition");
		});

		test("converts inline formatting", () => {
			const doc = htmlToDocument(
				"<p><strong>bold</strong> and <em>italic</em> and <code>code</code></p>",
			);
			const p = doc.content.children[0];
			expect(p?.name).toBe("paragraph");
			const names = p?.children.map((c) => c.name);
			expect(names).toContain("strong");
			expect(names).toContain("emphasis");
			expect(names).toContain("code");
		});

		test("converts preformatted code blocks with language", () => {
			const doc = htmlToDocument(
				'<pre><code class="language-js">const x = 1;</code></pre>',
			);
			const pre = doc.content.children[0];
			expect(pre?.name).toBe("preformatted");
			expect(pre?.attributes.get("data-lang")).toBe("js");
			expect(pre?.children[0]?.content).toBe("const x = 1;");
		});

		test("converts links and images", () => {
			const doc = htmlToDocument(
				'<p><a href="https://example.com" title="Example">link</a></p><img src="pic.png" alt="pic">',
			);
			const p = doc.content.children[0];
			const a = p?.children.find((c) => c.name === "link");
			expect(a?.attributes.get("target")).toBe("https://example.com");
			expect(a?.attributes.get("title")).toBe("Example");

			const img = doc.content.children[1];
			expect(img?.name).toBe("image");
			expect(img?.attributes.get("src")).toBe("pic.png");
			expect(img?.attributes.get("alt")).toBe("pic");
		});

		test("converts tables", () => {
			const doc = htmlToDocument(
				"<table><tr><td>a</td><td>b</td></tr></table>",
			);
			const table = doc.content.children[0];
			expect(table?.name).toBe("table");
			const row = table?.children[0];
			expect(row?.name).toBe("row");
			expect(row?.children.length).toBe(2);
			expect(row?.children.every((c) => c.name === "cell")).toBe(true);
		});

		test("marks unknown tags as markup nodes", () => {
			const doc = htmlToDocument('<custom data-x="1">content</custom>');
			const node = doc.content.children[0];
			expect(node?.name).toBe("markup");
			expect(node?.attributes.get("tag")).toBe("custom");
			expect(node?.attributes.get("data-x")).toBe("1");
		});

		test("extracts title and meta from head", () => {
			const doc = htmlToDocument(
				'<html><head><title>Doc</title><meta name="author" content="Me"></head><body><p>Hi</p></body></html>',
			);
			const title = doc.header.children.find((c) => c.name === "title");
			expect(title?.children[0]?.content).toBe("Doc");

			const meta = doc.header.children.find((c) => c.name === "meta");
			expect(meta?.attributes.get("name")).toBe("author");
			expect(meta?.children[0]?.content).toBe("Me");
		});

		test("FrontEndProcessor can be used directly", () => {
			const dom = new DOMDocument();
			const body = dom.body as DOMElement;
			const p = dom.createElement("p");
			p.appendChild(dom.createTextNode("x"));
			body.appendChild(p);

			const processor = new FrontEndProcessor();
			const doc = processor.process(body);
			expect(doc.content.children[0]?.name).toBe("paragraph");
		});

		test("drops whitespace-only text nodes between block elements", () => {
			const doc = htmlToDocument("<p>one</p>\n\n<p>two</p>");
			expect(doc.content.children.length).toBe(2);
			expect(doc.content.children.every((c) => c.name === "paragraph")).toBe(
				true,
			);
		});
	});

	describe("htmlToTexto", () => {
		test("produces texto markup", () => {
			const markup = htmlToTexto("<h1>Hello</h1><p>World</p>");
			expect(markup).toContain("Hello");
			expect(markup).toContain("World");
		});

		test("strict mode unwraps unknown tags", () => {
			const markup = htmlToTexto("<p>Hello <custom>world</custom></p>", {
				strict: true,
			});
			expect(markup).toContain("Hello world");
			expect(markup).not.toContain("<custom>");
			expect(markup).not.toContain("markup");
		});

		test("round-trips through TextoParser", () => {
			const html = `
				<h1>Title</h1>
				<p>This is <strong>bold</strong> and <em>italic</em>.</p>
				<ul>
					<li>one</li>
					<li>two</li>
				</ul>
			`;
			const markup = htmlToTexto(html);
			const parser = new TextoParser();
			const doc = parser.parse(markup);
			expect(doc.content.children.length).toBeGreaterThan(0);
		});
	});

	describe("CLI convert", () => {
		let tempDir: string;

		beforeAll(() => {
			tempDir = mkdtempSync(join(tmpdir(), "texto-convert-"));
		});

		afterAll(() => {
			rmSync(tempDir, { recursive: true, force: true });
		});

		test("converts HTML file to texto markup", async () => {
			const input = join(tempDir, "input.html");
			const output = join(tempDir, "output.txto");
			writeFileSync(input, "<h1>Hello</h1><p>World</p>");

			const originalArgv = process.argv;
			process.argv = [
				"node",
				"texto",
				"-fhtml",
				"-ttexto",
				"-o",
				output,
				input,
			];
			await main();
			process.argv = originalArgv;

			const result = readFileSync(output, "utf8");
			expect(result).toContain("Hello");
			expect(result).toContain("World");
		});

			test("infers json output from extension", async () => {
			const input = join(tempDir, "input.html");
			const output = join(tempDir, "output.json");
			writeFileSync(input, "<p>Hello</p>");

			const originalArgv = process.argv;
			process.argv = [
				"node",
				"texto",
				"-fhtml",
				"-tauto",
				"-o",
				output,
				input,
			];
			await main();
			process.argv = originalArgv;

			const result = readFileSync(output, "utf8");
			const parsed = JSON.parse(result);
			expect(parsed.type).toBe("document");
		});

		test("--strict strips unknown tags", async () => {
			const input = join(tempDir, "strict.html");
			const output = join(tempDir, "strict.json");
			writeFileSync(input, "<p>Hello <custom>world</custom></p>");

			const originalArgv = process.argv;
			process.argv = [
				"node",
				"texto",
				"-fhtml",
				"-tauto",
				"--strict",
				"-o",
				output,
				input,
			];
			await main();
			process.argv = originalArgv;

			const result = readFileSync(output, "utf8");
			const parsed = JSON.parse(result);
			const paragraph = parsed.content.children[0];
			expect(
				paragraph.children.some((c: { name?: string }) => c.name === "markup"),
			).toBe(false);
			const text = paragraph.children
				.filter((c: { type: string }) => c.type === "text")
				.map((c: { content: string }) => c.content)
				.join("");
			expect(text).toBe("Hello world");
		});
	});

	describe("CLI html to json", () => {
		let tempDir: string;

		beforeAll(() => {
			tempDir = mkdtempSync(join(tmpdir(), "texto-parse-html-"));
		});

		afterAll(() => {
			rmSync(tempDir, { recursive: true, force: true });
		});

			test("parses HTML file to JSON AST", async () => {
			const input = join(tempDir, "input.html");
			writeFileSync(input, "<h1>Hello</h1><p>World</p>");

			const logSpy = spyOn(console, "log").mockImplementation(() => {});
			const originalArgv = process.argv;
			process.argv = ["node", "texto", "-fhtml", "-tjson", input];
			await main();
			process.argv = originalArgv;

			const output = logSpy.mock.calls.at(-1)?.[0] as string;
			logSpy.mockRestore();
			expect(output).toBeDefined();
			const parsed = JSON.parse(output);
			expect(parsed.type).toBe("document");
		});

		test("--strict strips unknown tags", async () => {
			const input = join(tempDir, "strict.html");
			writeFileSync(input, "<p>Hello <custom>world</custom></p>");

			const logSpy = spyOn(console, "log").mockImplementation(() => {});
			const originalArgv = process.argv;
			process.argv = [
				"node",
				"texto",
				"-fhtml",
				"-tjson",
				"--strict",
				input,
			];
			await main();
			process.argv = originalArgv;

			const output = logSpy.mock.calls.at(-1)?.[0] as string;
			logSpy.mockRestore();
			expect(output).toBeDefined();
			const parsed = JSON.parse(output);
			const paragraph = parsed.content.children[0];
			expect(
				paragraph.children.some((c: { name?: string }) => c.name === "markup"),
			).toBe(false);
			const text = paragraph.children
				.filter((c: { type: string }) => c.type === "text")
				.map((c: { content: string }) => c.content)
				.join("");
			expect(text).toBe("Hello world");
		});
	});
});
