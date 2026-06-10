// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/backends/markdown
// Renders the Texto AST to CommonMark-oriented Markdown.

import type { Document, Node } from "../utils/types.ts";
import {
	escapeAttribute,
	getElementChild,
	getElementChildren,
	getSectionParts,
	indentBlock,
	renderBlockChildren,
	renderInlineChildren,
} from "./shared/markup.ts";
import type { OutputBackend } from "./types.ts";

function formatMarkdown(doc: Document): string {
	const parts: string[] = [];
	const header = formatHeader(doc.header);
	const content = renderBlockChildren(doc.content, formatBlock);
	const references = renderBlockChildren(doc.references, formatBlock);
	const appendices = renderBlockChildren(doc.appendices, formatBlock);

	if (header) parts.push(header);
	if (content) parts.push(content);
	if (references) parts.push(references);
	if (appendices) parts.push(appendices);

	return parts
		.join("\n\n")
		.replace(/[ \t]+$/gm, "")
		.trimEnd();
}

function formatHeader(node: Node): string {
	const title = getElementChild(node, "title");
	const lines: string[] = [];
	if (title) {
		lines.push(`# ${formatInlineChildren(title).trim()}`);
	}
	for (const meta of getElementChildren(node, "meta")) {
		const name = meta.attributes.get("name") || "meta";
		const value = formatInlineChildren(meta).trim();
		lines.push(`<!-- meta ${name}: ${value} -->`);
	}
	return lines.join("\n\n");
}

function formatBlock(node: Node): string {
	if (node.type === "text") return node.content || "";
	if (node.type !== "element") return "";

	switch (node.name) {
		case "section":
			return formatSection(node);
		case "paragraph":
			return formatInlineChildren(node);
		case "list":
			return formatList(node);
		case "preformatted":
			return formatPreformatted(node);
		case "blockquote":
			return formatBlockquote(node);
		case "horizontal-rule":
			return "---";
		case "table":
			return formatTable(node);
		case "tagged":
			return formatTagged(node);
		default:
			return renderInlineChildren(node, formatInline);
	}
}

function formatInline(node: Node): string {
	if (node.type === "text") return node.content || "";
	if (node.type !== "element") return "";

	switch (node.name) {
		case "strong":
			return `**${formatInlineChildren(node)}**`;
		case "emphasis":
			return `*${formatInlineChildren(node)}*`;
		case "code":
			return `\`${formatInlineChildren(node)}\``;
		case "link":
			return formatLink(node);
		case "image":
			return formatImage(node);
		case "target": {
			const name = node.attributes.get("name") || "";
			return `<a id="${escapeAttribute(name)}"></a>`;
		}
		case "markup":
			return formatMarkup(node);
		case "br":
			return "  \n";
		default:
			return formatInlineChildren(node);
	}
}

function formatInlineChildren(node: Node): string {
	return renderInlineChildren(node, formatInline);
}

function formatSection(node: Node): string {
	const { depth, title, content } = getSectionParts(node);
	const heading =
		`${"#".repeat(Math.min(depth, 6))} ${title ? formatInlineChildren(title).trim() : ""}`.trimEnd();
	const body = content ? renderBlockChildren(content, formatBlock).trim() : "";
	return body ? `${heading}\n\n${body}` : heading;
}

function formatList(node: Node): string {
	const type = node.attributes.get("type") || "unordered";
	return getElementChildren(node, "item")
		.map((item, index) => {
			if (type === "definition") {
				const term = getElementChild(item, "term");
				const definition = getElementChild(item, "definition");
				const termText = term ? formatInlineChildren(term).trim() : "";
				const defText = definition
					? renderBlockChildren(definition, formatBlock) ||
						formatInlineChildren(definition)
					: "";
				return defText
					? `- **${termText}:** ${defText.trim()}`
					: `- **${termText}**`;
			}

			const marker =
				type === "ordered"
					? `${index + 1}. `
					: type === "todo"
						? `- [${item.attributes.get("todo") === "done" ? "x" : " "}] `
						: "- ";
			const blocks = item.children
				.map((child) => formatBlock(child))
				.filter(Boolean);
			if (blocks.length === 0) return marker.trimEnd();
			const [first, ...rest] = blocks;
			return [
				`${marker}${first}`,
				...rest.map((block) => indentBlock(block, " ".repeat(marker.length))),
			].join("\n");
		})
		.join("\n");
}

function formatPreformatted(node: Node): string {
	const lang = node.attributes.get("data-lang") || "";
	const content = formatInlineChildren(node);
	return `${lang ? `\`\`\`${lang}` : "```"}\n${content}\n\`\`\``;
}

function formatBlockquote(node: Node): string {
	const content =
		renderBlockChildren(node, formatBlock) || formatInlineChildren(node);
	return indentBlock(content, "> ");
}

function formatTable(node: Node): string {
	const rows = getElementChildren(node, "row");
	if (rows.length === 0) return "";
	const tableRows = rows.map((row) =>
		getElementChildren(row, "cell").map((cell) => formatInlineChildren(cell)),
	);
	const header = tableRows[0];
	const separator = header.map(() => "---");
	const lines = [
		`| ${header.join(" | ")} |`,
		`| ${separator.join(" | ")} |`,
		...tableRows.slice(1).map((cells) => `| ${cells.join(" | ")} |`),
	];
	return lines.join("\n");
}

function formatTagged(node: Node): string {
	const tag = node.attributes.get("tag") || "Note";
	const content =
		renderBlockChildren(node, formatBlock) || formatInlineChildren(node);
	return `> **${tag}:** ${content.trim()}`;
}

function formatLink(node: Node): string {
	const target = node.attributes.get("target") || "";
	const title = node.attributes.get("title") || "";
	const text = formatInlineChildren(node);
	if (!text || text === target) {
		return `<${target}>`;
	}
	if (title) {
		return `[${text}](${target} "${title.replace(/"/g, '\\"')}")`;
	}
	return `[${text}](${target})`;
}

function formatImage(node: Node): string {
	const src = node.attributes.get("src") || "";
	const alt = node.attributes.get("alt") || "";
	const title = node.attributes.get("title") || "";
	if (title) {
		return `![${alt}](${src} "${title.replace(/"/g, '\\"')}")`;
	}
	return `![${alt}](${src})`;
}

function formatMarkup(node: Node): string {
	const tag = node.attributes.get("tag") || "div";
	const attrs: string[] = [];
	for (const [key, value] of node.attributes) {
		if (key !== "tag" && !key.startsWith("_")) {
			attrs.push(`${key}="${escapeAttribute(value)}"`);
		}
	}
	const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
	const content = formatInlineChildren(node);
	return content
		? `<${tag}${attrText}>${content}</${tag}>`
		: `<${tag}${attrText} />`;
}

const markdownBackend: OutputBackend = (doc: Document): string =>
	formatMarkdown(doc);

export { formatMarkdown, markdownBackend };

// EOF
