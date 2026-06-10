// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/frontends/html
// Converts HTML DOM trees into Texto AST documents. Provides a
// `FrontEndProcessor` that dispatches to `on[TagName]` handlers and a
// `NodeFactory` tailored to Texto markup constructs.
//
// Example:
// ```typescript
// import { htmlToTexto } from "./frontends/html.ts";
// const markup = htmlToTexto("<h1>Hello</h1><p>World</p>");
// ```

import type {
	Element as DOMElement,
	Node as DOMNode,
	TextNode as DOMTextNode,
} from "../../../../deps/domish.js/src/ts/domish/domish.ts";
import { parse as parseWithDomish } from "../../../../deps/domish.js/src/ts/domish/xmlish.ts";
import { formatTexto } from "../backends/texto.ts";
// ----------------------------------------------------------------------------
//
// IMPORTS
//
// ----------------------------------------------------------------------------
import { DocumentBuilder } from "../document/builder.ts";
import {
	appendChild,
	createComment,
	createElement,
	createText,
} from "../document/node.ts";
import type { Document, Node as TextoNode } from "../utils/types.ts";
import type { InputFrontend } from "./types.ts";

// ----------------------------------------------------------------------------
//
// TYPES
//
// ----------------------------------------------------------------------------
// Type: FrontEndContext
// Context passed to every `on[TagName]` handler during HTML tree walking.
//
// Properties:
// - parent: TextoNode | null - immediate Texto AST parent, if any
// - ancestors: TextoNode[] - stack of Texto AST ancestors above parent
// - depth: number - nesting depth in the HTML tree
// - preserveWhitespace: boolean | undefined - when true, keep whitespace as-is
// - skipBlankText: boolean | undefined - when true, drop whitespace-only text nodes
// - strict: boolean | undefined - when true, unknown tags are unwrapped
interface FrontEndContext {
	parent: TextoNode | null;
	ancestors: TextoNode[];
	depth: number;
	preserveWhitespace?: boolean;
	skipBlankText?: boolean;
	strict?: boolean;
}

// Type: NodeFactory
// Factory interface for producing Texto AST nodes. Covers generic nodes and
// semantic Texto constructs (sections, lists, tables, preformatted blocks, etc.).
interface NodeFactory {
	document(): Document;
	element(name: string, attributes?: Record<string, string>): TextoNode;
	text(content: string): TextoNode;
	comment(content: string): TextoNode;
	append(parent: TextoNode, child: TextoNode): void;

	section(depth?: number, attributes?: Record<string, string>): TextoNode;
	title(attributes?: Record<string, string>): TextoNode;
	content(attributes?: Record<string, string>): TextoNode;
	paragraph(attributes?: Record<string, string>): TextoNode;
	blockquote(attributes?: Record<string, string>): TextoNode;
	horizontalRule(attributes?: Record<string, string>): TextoNode;
	lineBreak(attributes?: Record<string, string>): TextoNode;

	list(
		type: "ordered" | "unordered" | "definition" | "todo",
		attributes?: Record<string, string>,
	): TextoNode;
	item(attributes?: Record<string, string>): TextoNode;
	term(attributes?: Record<string, string>): TextoNode;
	definition(attributes?: Record<string, string>): TextoNode;

	code(attributes?: Record<string, string>): TextoNode;
	preformatted(
		lang?: string,
		output?: string,
		attributes?: Record<string, string>,
	): TextoNode;

	table(attributes?: Record<string, string>): TextoNode;
	row(attributes?: Record<string, string>): TextoNode;
	cell(attributes?: Record<string, string>): TextoNode;

	strong(attributes?: Record<string, string>): TextoNode;
	emphasis(attributes?: Record<string, string>): TextoNode;
	link(target: string, attributes?: Record<string, string>): TextoNode;
	anchor(href: string, attributes?: Record<string, string>): TextoNode;
	image(
		src: string,
		alt?: string,
		attributes?: Record<string, string>,
	): TextoNode;

	unknown(tag: string, attributes?: Record<string, string>): TextoNode;
}

// ----------------------------------------------------------------------------
//
// DEFAULT NODE FACTORY
//
// ----------------------------------------------------------------------------
// Class: DefaultNodeFactory
// Builds Texto AST nodes using the existing document builder and node helpers.
class DefaultNodeFactory implements NodeFactory {
	private builder: DocumentBuilder;

	constructor() {
		this.builder = new DocumentBuilder();
	}

	document(): Document {
		return this.builder.getDocument();
	}

	element(name: string, attributes: Record<string, string> = {}): TextoNode {
		return createElement(name, attributes);
	}

	text(content: string): TextoNode {
		return createText(content);
	}

	comment(content: string): TextoNode {
		return createComment(content);
	}

	append(parent: TextoNode, child: TextoNode): void {
		appendChild(parent, child);
	}

	section(depth = 1, attributes: Record<string, string> = {}): TextoNode {
		return this.element("section", { depth: String(depth), ...attributes });
	}

	title(attributes: Record<string, string> = {}): TextoNode {
		return this.element("title", attributes);
	}

	content(attributes: Record<string, string> = {}): TextoNode {
		return this.element("content", attributes);
	}

	paragraph(attributes: Record<string, string> = {}): TextoNode {
		return this.element("paragraph", attributes);
	}

	blockquote(attributes: Record<string, string> = {}): TextoNode {
		return this.element("blockquote", attributes);
	}

	horizontalRule(attributes: Record<string, string> = {}): TextoNode {
		return this.element("horizontal-rule", attributes);
	}

	lineBreak(attributes: Record<string, string> = {}): TextoNode {
		return this.element("br", attributes);
	}

	list(
		type: "ordered" | "unordered" | "definition" | "todo",
		attributes: Record<string, string> = {},
	): TextoNode {
		return this.element("list", { type, ...attributes });
	}

	item(attributes: Record<string, string> = {}): TextoNode {
		return this.element("item", attributes);
	}

	term(attributes: Record<string, string> = {}): TextoNode {
		return this.element("term", attributes);
	}

	definition(attributes: Record<string, string> = {}): TextoNode {
		return this.element("definition", attributes);
	}

	code(attributes: Record<string, string> = {}): TextoNode {
		return this.element("code", attributes);
	}

	preformatted(
		lang?: string,
		output?: string,
		attributes: Record<string, string> = {},
	): TextoNode {
		const attrs = { ...attributes };
		if (lang) attrs["data-lang"] = lang;
		if (output) attrs["data-output"] = output;
		return this.element("preformatted", attrs);
	}

	table(attributes: Record<string, string> = {}): TextoNode {
		return this.element("table", attributes);
	}

	row(attributes: Record<string, string> = {}): TextoNode {
		return this.element("row", attributes);
	}

	cell(attributes: Record<string, string> = {}): TextoNode {
		return this.element("cell", attributes);
	}

	strong(attributes: Record<string, string> = {}): TextoNode {
		return this.element("strong", attributes);
	}

	emphasis(attributes: Record<string, string> = {}): TextoNode {
		return this.element("emphasis", attributes);
	}

	link(target: string, attributes: Record<string, string> = {}): TextoNode {
		return this.element("link", { target, ...attributes });
	}

	anchor(href: string, attributes: Record<string, string> = {}): TextoNode {
		const { href: _href, ...rest } = attributes;
		return this.element("link", { target: href, ...rest });
	}

	image(
		src: string,
		alt?: string,
		attributes: Record<string, string> = {},
	): TextoNode {
		const attrs = { src, ...attributes };
		if (alt) attrs.alt = alt;
		return this.element("image", attrs);
	}

	unknown(tag: string, attributes: Record<string, string> = {}): TextoNode {
		return this.element("markup", { tag, ...attributes });
	}
}

// ----------------------------------------------------------------------------
//
// HTML PARSING
//
// ----------------------------------------------------------------------------
// Function: parseHTML
// Parses an HTML string into a DOM element. Uses the native DOMParser when
// available, otherwise falls back to the vendored domish parser.
function parseHTML(html: string): DOMElement {
	if (typeof DOMParser !== "undefined") {
		const Parser = DOMParser as unknown as new () => {
			parseFromString(
				html: string,
				mimeType: string,
			): { documentElement: DOMElement };
		};
		const parser = new Parser();
		const doc = parser.parseFromString(html, "text/html");
		return doc.documentElement;
	}
	const doc = parseWithDomish(html);
	return doc.body;
}

// ----------------------------------------------------------------------------
//
// FRONTEND PROCESSOR
//
// ----------------------------------------------------------------------------
// Class: FrontEndProcessor
// Walks an HTML tree and converts it to a Texto AST using a NodeFactory.
// Handlers are named `on[TagName]` and manage recursion explicitly via
// `this.process(element, context)`.
class FrontEndProcessor {
	protected factory: NodeFactory;
	protected document: Document;
	private sectionStack: Array<{ container: TextoNode; depth: number }> = [];
	private strict: boolean;

	constructor(factory?: NodeFactory, options?: { strict?: boolean }) {
		this.factory = factory ?? new DefaultNodeFactory();
		this.document = this.factory.document();
		this.strict = options?.strict ?? false;
	}

	// Method: process
	// Converts `root` (an HTML element or node) into a Texto Document.
	process(
		root: DOMElement | DOMNode,
		options?: { strict?: boolean },
	): Document {
		this.document = this.factory.document();
		this.sectionStack = [];
		const strict = options?.strict ?? this.strict;

		const result = this.dispatch(root, {
			parent: null,
			ancestors: [],
			depth: 0,
			preserveWhitespace: false,
			strict,
		});

		if (result) {
			this.mergeInto(this.document.content, result);
		}

		return this.document;
	}

	// Method: dispatch
	// Routes a single HTML node to its handler or to the text/comment fallback.
	protected dispatch(
		node: DOMNode,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		if (this.isTextNode(node)) {
			const preserve = context.preserveWhitespace ?? false;
			const text = this.normalizeText(node.data, preserve);
			if (!text) return null;
			if ((context.skipBlankText ?? false) && text.trim() === "") {
				return null;
			}
			return this.factory.text(text);
		}

		if (node.nodeType === 8) {
			// COMMENT_NODE
			return this.factory.comment((node as DOMTextNode).data);
		}

		if (!this.isElementNode(node)) {
			return null;
		}

		const element = node as DOMElement;
		const tag = this.getTagName(element);
		const handlerName =
			`on${tag.charAt(0).toUpperCase()}${tag.slice(1)}` as keyof this;
		const handler = this[handlerName] as
			| ((
					element: DOMElement,
					context: FrontEndContext,
			  ) => TextoNode | TextoNode[] | null)
			| undefined;

		if (handler) {
			return handler.call(this, element, context);
		}

		return this.onUnknown(element, context);
	}

	// ------------------------------------------------------------------------
	// HANDLERS
	// ------------------------------------------------------------------------

	onHtml(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		for (const child of element.childNodes) {
			if (!this.isElementNode(child)) continue;
			const tag = this.getTagName(child as DOMElement);
			if (tag === "head") {
				this.dispatch(
					child as DOMElement,
					this.childContext(this.document.header, context),
				);
			} else if (tag === "body") {
				const bodyResult = this.dispatch(
					child as DOMElement,
					this.childContext(this.document.content, context),
				);
				if (bodyResult) {
					this.mergeInto(this.document.content, bodyResult);
				}
			}
		}
		return null;
	}

	onHead(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		for (const child of element.childNodes) {
			if (this.isElementNode(child)) {
				this.dispatch(
					child as DOMElement,
					this.childContext(this.document.header, context),
				);
			}
		}
		return null;
	}

	onBody(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const content = this.factory.content();
		this.processContainer(element, context, content, 0);
		return content;
	}

	onTitle(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const title = this.factory.title();
		const children = this.processChildren(
			element,
			this.childContext(title, context),
		);
		this.appendChildren(title, children);
		this.factory.append(this.document.header, title);
		return null;
	}

	onMeta(
		element: DOMElement,
		_context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const name = element.getAttribute("name") || "";
		const content = element.getAttribute("content") || "";
		if (name && content) {
			const meta = this.factory.element("meta", { name });
			this.factory.append(meta, this.factory.text(content));
			this.factory.append(this.document.header, meta);
		}
		return null;
	}

	onH1(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createSection(element, 1, context);
	}

	onH2(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createSection(element, 2, context);
	}

	onH3(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createSection(element, 3, context);
	}

	onH4(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createSection(element, 4, context);
	}

	onH5(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createSection(element, 5, context);
	}

	onH6(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createSection(element, 6, context);
	}

	onSection(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const depth = context.depth + 1;
		const section = this.factory.section(depth);
		const content = this.factory.content();
		this.factory.append(section, content);
		this.processContainer(element, context, content, depth);
		return section;
	}

	onP(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const node = this.factory.paragraph();
		const children = this.processChildren(
			element,
			this.childContext(node, context),
		);
		this.appendChildren(node, children);
		return node;
	}

	onUl(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createList(element, "unordered", context);
	}

	onOl(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createList(element, "ordered", context);
	}

	onLi(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const item = this.factory.item();
		const children = this.processChildren(
			element,
			this.childContext(item, context),
		);
		this.appendChildren(item, children);
		return item;
	}

	onDl(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const list = this.factory.list("definition");
		const listContext = this.childContext(list, context, {
			skipBlankText: true,
		});
		let currentItem: TextoNode | null = null;

		for (const child of element.childNodes) {
			if (!this.isElementNode(child)) continue;
			const tag = this.getTagName(child as DOMElement);

			if (tag === "dt") {
				currentItem = this.factory.item();
				this.factory.append(list, currentItem);
				const term = this.factory.term();
				const termChildren = this.processChildren(
					child as DOMElement,
					this.childContext(term, listContext),
				);
				this.appendChildren(term, termChildren);
				this.factory.append(currentItem, term);
			} else if (tag === "dd" && currentItem) {
				const def = this.factory.definition();
				const defChildren = this.processChildren(
					child as DOMElement,
					this.childContext(def, listContext),
				);
				this.appendChildren(def, defChildren);
				this.factory.append(currentItem, def);
			}
		}

		return list;
	}

	onDt(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const term = this.factory.term();
		const children = this.processChildren(
			element,
			this.childContext(term, context),
		);
		this.appendChildren(term, children);
		return term;
	}

	onDd(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const def = this.factory.definition();
		const children = this.processChildren(
			element,
			this.childContext(def, context),
		);
		this.appendChildren(def, children);
		return def;
	}

	onStrong(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createInline("strong", element, context);
	}

	onB(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createInline("strong", element, context);
	}

	onEm(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createInline("emphasis", element, context);
	}

	onI(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createInline("emphasis", element, context);
	}

	onCode(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createInline("code", element, context);
	}

	onPre(
		element: DOMElement,
		_context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const code = this.findChildElement(element, "code");
		const source = code ?? element;
		const lang = code ? this.inferLang(code) : undefined;
		const output = code?.getAttribute("data-output") ?? undefined;
		const text = this.getTextContent(source);
		const node = this.factory.preformatted(lang, output);
		if (text) {
			this.factory.append(node, this.factory.text(text));
		}
		return node;
	}

	onA(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const href = element.getAttribute("href") || "";
		const title = element.getAttribute("title") || undefined;
		const attrs: Record<string, string> = {};
		if (title) attrs.title = title;
		const node = this.factory.link(href, attrs);
		const children = this.processChildren(
			element,
			this.childContext(node, context),
		);
		this.appendChildren(node, children);
		return node;
	}

	onImg(
		element: DOMElement,
		_context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const src = element.getAttribute("src") || "";
		const alt = element.getAttribute("alt") || "";
		const title = element.getAttribute("title") || undefined;
		return this.factory.image(src, alt, title ? { title } : undefined);
	}

	onBlockquote(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const node = this.factory.blockquote();
		const children = this.processChildren(
			element,
			this.childContext(node, context, { skipBlankText: true }),
		);
		this.appendChildren(node, children);
		return node;
	}

	onHr(
		_element: DOMElement,
		_context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.factory.horizontalRule();
	}

	onBr(
		_element: DOMElement,
		_context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.factory.lineBreak();
	}

	onTable(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const node = this.factory.table();
		const tableContext = this.childContext(node, context, {
			skipBlankText: true,
		});

		for (const child of element.childNodes) {
			if (!this.isElementNode(child)) continue;
			const tag = this.getTagName(child as DOMElement);
			if (tag === "tr") {
				const row = this.dispatch(child as DOMElement, tableContext);
				this.appendChildren(node, this.asArray(row));
			} else if (["tbody", "thead", "tfoot"].includes(tag)) {
				for (const rowChild of (child as DOMElement).childNodes) {
					if (
						this.isElementNode(rowChild) &&
						this.getTagName(rowChild as DOMElement) === "tr"
					) {
						const row = this.dispatch(rowChild as DOMElement, tableContext);
						this.appendChildren(node, this.asArray(row));
					}
				}
			}
		}

		return node;
	}

	onTr(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		const node = this.factory.row();
		const rowContext = this.childContext(node, context, {
			skipBlankText: true,
		});

		for (const child of element.childNodes) {
			if (!this.isElementNode(child)) continue;
			const tag = this.getTagName(child as DOMElement);
			if (tag === "td" || tag === "th") {
				const cell = this.dispatch(child as DOMElement, rowContext);
				this.appendChildren(node, this.asArray(cell));
			}
		}

		return node;
	}

	onTd(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createCell(element, context);
	}

	onTh(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		return this.createCell(element, context);
	}

	onUnknown(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode | TextoNode[] | null {
		if (context.strict) {
			return this.processChildren(element, {
				...context,
				depth: context.depth + 1,
			});
		}
		const tag = this.getTagName(element);
		const attrs = this.getAttributes(element);
		const node = this.factory.unknown(tag, attrs);
		const children = this.processChildren(
			element,
			this.childContext(node, context),
		);
		this.appendChildren(node, children);
		return node;
	}

	// ------------------------------------------------------------------------
	// HELPERS
	// ------------------------------------------------------------------------

	protected createSection(
		element: DOMElement,
		depth: number,
		context: FrontEndContext,
	): TextoNode {
		const section = this.factory.section(depth);
		const title = this.factory.title();
		const titleChildren = this.processChildren(
			element,
			this.childContext(title, context),
		);
		this.appendChildren(title, titleChildren);
		this.factory.append(section, title);

		const content = this.factory.content();
		this.factory.append(section, content);

		return section;
	}

	protected createList(
		element: DOMElement,
		type: "unordered" | "ordered" | "definition" | "todo",
		context: FrontEndContext,
	): TextoNode {
		const list = this.factory.list(type);
		const listContext = this.childContext(list, context, {
			skipBlankText: true,
		});
		for (const child of element.childNodes) {
			if (!this.isElementNode(child)) continue;
			const nodes = this.dispatch(child as DOMElement, listContext);
			this.appendChildren(list, this.asArray(nodes));
		}
		return list;
	}

	protected createInline(
		name: "strong" | "emphasis" | "code",
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode {
		let node: TextoNode;
		switch (name) {
			case "strong":
				node = this.factory.strong();
				break;
			case "emphasis":
				node = this.factory.emphasis();
				break;
			case "code":
				node = this.factory.code();
				break;
		}
		const children = this.processChildren(
			element,
			this.childContext(node, context),
		);
		this.appendChildren(node, children);
		return node;
	}

	protected createCell(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode {
		const node = this.factory.cell();
		const children = this.processChildren(
			element,
			this.childContext(node, context),
		);
		this.appendChildren(node, children);
		return node;
	}

	protected processContainer(
		element: DOMElement,
		context: FrontEndContext,
		container: TextoNode,
		baseDepth: number,
	): void {
		this.pushContainer(container, baseDepth);

		for (const child of element.childNodes) {
			if (this.isTextNode(child)) {
				const text = this.normalizeText(
					(child as DOMTextNode).data,
					context.preserveWhitespace ?? false,
				);
				if (text && text.trim() !== "") {
					this.factory.append(this.currentContainer(), this.factory.text(text));
				}
				continue;
			}

			if (!this.isElementNode(child)) continue;

			const el = child as DOMElement;
			const tag = this.getTagName(el);
			const headingMatch = tag.match(/^h([1-6])$/);
			const childContext = this.childContext(this.currentContainer(), context, {
				skipBlankText: true,
			});

			if (headingMatch) {
				const depth = parseInt(headingMatch[1], 10);
				this.popContainers(depth);
				const section = this.dispatch(el, childContext);
				if (section) {
					const sectionNode = Array.isArray(section) ? section[0] : section;
					this.factory.append(this.currentContainer(), sectionNode);
					const contentNode = this.findContentChild(sectionNode);
					if (contentNode) {
						this.pushContainer(contentNode, depth);
					}
				}
			} else {
				const nodes = this.dispatch(el, childContext);
				for (const node of this.asArray(nodes)) {
					this.factory.append(this.currentContainer(), node);
				}
			}
		}

		this.popAllContainers();
	}

	protected processChildren(
		element: DOMElement,
		context: FrontEndContext,
	): TextoNode[] {
		const nodes: TextoNode[] = [];
		for (const child of element.childNodes) {
			const result = this.dispatch(child, context);
			nodes.push(...this.asArray(result));
		}
		return nodes;
	}

	protected childContext(
		parent: TextoNode,
		context: FrontEndContext,
		overrides?: Partial<FrontEndContext>,
	): FrontEndContext {
		return {
			parent,
			ancestors: context.parent
				? [...context.ancestors, context.parent]
				: context.ancestors,
			depth: context.depth + 1,
			preserveWhitespace: context.preserveWhitespace,
			skipBlankText: context.skipBlankText,
			strict: context.strict,
			...overrides,
		};
	}

	protected appendChildren(parent: TextoNode, children: TextoNode[]): void {
		for (const child of children) {
			this.factory.append(parent, child);
		}
	}

	protected mergeInto(
		target: TextoNode,
		result: TextoNode | TextoNode[],
	): void {
		for (const node of this.asArray(result)) {
			if (node.type === "element" && node.name === "content") {
				for (const child of [...node.children]) {
					this.factory.append(target, child);
				}
			} else {
				this.factory.append(target, node);
			}
		}
	}

	protected pushContainer(container: TextoNode, depth: number): void {
		this.sectionStack.push({ container, depth });
	}

	protected popContainers(minDepth: number): void {
		while (this.sectionStack.length > 0) {
			const top = this.sectionStack[this.sectionStack.length - 1];
			if (top && top.depth >= minDepth) {
				this.sectionStack.pop();
			} else {
				break;
			}
		}
	}

	protected currentContainer(): TextoNode {
		const top = this.sectionStack[this.sectionStack.length - 1];
		if (!top) {
			throw new Error("No container available in FrontEndProcessor");
		}
		return top.container;
	}

	protected popAllContainers(): void {
		this.sectionStack = [];
	}

	protected findContentChild(node: TextoNode): TextoNode | null {
		return (
			node.children.find(
				(child) => child.type === "element" && child.name === "content",
			) || null
		);
	}

	protected findChildElement(
		element: DOMElement,
		name: string,
	): DOMElement | undefined {
		for (const child of element.childNodes) {
			if (
				this.isElementNode(child) &&
				this.getTagName(child as DOMElement) === name
			) {
				return child as DOMElement;
			}
		}
		return undefined;
	}

	protected inferLang(code: DOMElement): string | undefined {
		const dataLang = code.getAttribute("data-lang");
		if (dataLang) return dataLang;
		const classAttr = code.getAttribute("class") || "";
		const match = classAttr.match(/(?:^|\s)language-(\S+)/);
		return match ? match[1] : undefined;
	}

	protected getTextContent(element: DOMElement): string {
		const parts: string[] = [];
		for (const child of element.childNodes) {
			if (this.isTextNode(child)) {
				parts.push(child.data);
			} else if (this.isElementNode(child)) {
				parts.push(this.getTextContent(child as DOMElement));
			}
		}
		return parts.join("");
	}

	protected getTagName(element: DOMElement): string {
		return element.nodeName.toLowerCase();
	}

	protected getAttributes(element: DOMElement): Record<string, string> {
		const attrs: Record<string, string> = {};
		for (const attr of element.attributes) {
			if (attr.value !== null && attr.value !== undefined) {
				attrs[attr.name] = attr.value;
			}
		}
		return attrs;
	}

	protected normalizeText(text: string, preserveWhitespace: boolean): string {
		return preserveWhitespace ? text : text.replace(/\s+/g, " ");
	}

	protected isElementNode(node: DOMNode): node is DOMElement {
		return node.nodeType === 1;
	}

	protected isTextNode(node: DOMNode): node is DOMTextNode {
		return node.nodeType === 3;
	}

	protected asArray<T>(value: T | T[] | null | undefined): T[] {
		if (value === null || value === undefined) return [];
		return Array.isArray(value) ? value : [value];
	}
}

// ----------------------------------------------------------------------------
//
// CONVENIENCE FUNCTIONS
//
// ----------------------------------------------------------------------------
// Function: htmlToDocument
// Parses `html` and returns a Texto Document.
function htmlToDocument(
	html: string,
	options?: { strict?: boolean },
): Document {
	const processor = new FrontEndProcessor(undefined, options);
	const root = parseHTML(html);
	return processor.process(root);
}

// Function: htmlToTexto
// Parses `html` and returns native Texto markup.
function htmlToTexto(html: string, options?: { strict?: boolean }): string {
	const doc = htmlToDocument(html, options);
	return formatTexto(doc);
}

const htmlFrontend: InputFrontend = (input, options = {}) =>
	htmlToDocument(input, { strict: options.strict });

export type { FrontEndContext, NodeFactory };
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export {
	DefaultNodeFactory,
	FrontEndProcessor,
	htmlFrontend,
	htmlToDocument,
	htmlToTexto,
};

// EOF
