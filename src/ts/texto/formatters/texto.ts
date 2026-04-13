// Texto formatter - Convert AST back to texto format

import type { Document, Node } from "../utils/types.ts";

export function formatTexto(doc: Document): string {
	const parts: string[] = [];

	// Header
	const headerText = formatHeader(doc.header);
	if (headerText) {
		parts.push(headerText);
	}

	// Content
	const contentText = formatContent(doc.content);
	if (contentText) {
		if (parts.length > 0) parts.push("");
		parts.push(contentText);
	}

	// References
	const refsText = formatContent(doc.references);
	if (refsText) {
		if (parts.length > 0) parts.push("");
		parts.push(refsText);
	}

	// Appendices
	const appText = formatContent(doc.appendices);
	if (appText) {
		if (parts.length > 0) parts.push("");
		parts.push(appText);
	}

	let result = parts.join("\n\n");

	// Normalize line endings
	result = result.replace(/\r\n/g, "\n");

	// Remove trailing whitespace from each line
	result = result.replace(/[ \t]+$/gm, "");

	// Trim trailing document whitespace, but preserve leading indentation
	result = result.trimEnd();

	return result;
}

function formatContent(node: Node): string {
	if (!node.children || node.children.length === 0) {
		return "";
	}

	// Format each block child with blank lines between
	const blocks: string[] = [];
	for (const child of node.children) {
		const formatted = formatBlock(child);
		if (formatted) {
			blocks.push(formatted);
		}
	}

	return blocks.join("\n\n");
}

function formatBlock(node: Node): string {
	if (node.type === "text") {
		return node.content || "";
	}

	if (node.type === "comment") {
		return "";
	}

	if (node.type !== "element") {
		return "";
	}

	const name = node.name || "";

	switch (name) {
		case "section":
			return formatSection(node);

		case "list":
			return formatList(node);

		case "p":
		case "paragraph":
			return formatParagraph(node);

		case "pre":
		case "preformatted":
			return formatPreformatted(node);

		case "table":
			return formatTable(node);

		case "tagged":
			return formatTaggedBlock(node);

		default:
			return formatChildren(node);
	}
}

function formatInline(node: Node): string {
	if (node.type === "text") {
		return node.content || "";
	}

	if (node.type !== "element") {
		return "";
	}

	const name = node.name || "";

	switch (name) {
		case "strong":
			return `**${formatChildren(node)}**`;

		case "em":
		case "emphasis":
			return `*${formatChildren(node)}*`;

		case "code":
			return `\`${formatChildren(node)}\``;

		case "link":
			return formatLink(node);

		case "target":
			return formatTarget(node);

		case "term":
			return `_${formatChildren(node)}_`;

		case "markup":
			return formatMarkup(node);

		default:
			return formatChildren(node);
	}
}

function formatChildren(node: Node): string {
	if (!node.children || node.children.length === 0) {
		return "";
	}

	return node.children.map(formatInline).join("");
}

function formatHeader(node: Node): string {
	const lines: string[] = [];

	for (const child of node.children) {
		if (child.type === "element") {
			if (child.name === "title") {
				lines.push(`== ${formatChildren(child).trim()}`);
			} else if (child.name === "meta") {
				const name = child.attributes.get("name") || "";
				const value = formatChildren(child).trim();
				lines.push(`-- ${name}: ${value}`);
			}
		}
	}

	return lines.join("\n");
}

function formatSection(node: Node): string {
	const style = node.attributes.get("_style");
	const depth = parseInt(node.attributes.get("depth") || "1", 10);

	const titleNode = node.children.find(
		(c) => c.type === "element" && c.name === "title",
	);
	const title = titleNode ? formatInline(titleNode).trim() : "";

	const contentNode = node.children.find(
		(c) => c.type === "element" && c.name === "content",
	);
	const content = contentNode ? formatContent(contentNode).trim() : "";

	let heading = "";

	if (style === "numbered") {
		// Numbered section: 1. Title
		const number = node.attributes.get("_number") || "";
		heading = `${number}. ${title}`;
	} else if (style === "hash") {
		// Hash section: # Title or ## Title
		heading = `${"#".repeat(depth)} ${title}`;
	} else {
		// Underlined section: Title\n===
		const weight = node.attributes.get("_weight");
		const underlineChar = weight === "2" ? "=" : "-";
		const underline = underlineChar.repeat(Math.max(3, title.length));
		heading = `${title}\n${underline}`;
	}

	// Remove trailing whitespace from heading
	heading = heading.replace(/[ \t]+$/gm, "");

	if (content) {
		return `${heading}\n\n${content}`;
	}

	return heading;
}

function formatList(node: Node): string {
	const type = node.attributes.get("type") || "unordered";

	if (type === "definition") {
		return formatDefinitionList(node);
	}

	const items = node.children.filter(
		(c) => c.type === "element" && c.name === "item",
	);

	const formatted = items.map((item, index) => {
		const indent = item.attributes.get("_indent") || "0";
		const spaces = type === "ordered" ? "" : " ".repeat(parseInt(indent, 10));

		// Handle nested blocks in list items
		const itemText = formatItemWithNestedBlocks(item, parseInt(indent, 10));

		if (type === "todo") {
			const checked = item.attributes.get("todo") === "done";
			return formatListItemText(`[${checked ? "x" : " "}] `, spaces, itemText);
		} else if (type === "unordered") {
			return formatListItemText("- ", spaces, itemText);
		} else if (type === "ordered") {
			return formatListItemText(`${index + 1}) `, spaces, itemText);
		}

		return itemText;
	});

	return formatted.join("\n");
}

function formatListItemText(
	marker: string,
	spaces: string,
	itemText: string,
): string {
	const lines = itemText.split("\n");
	const firstLine = lines[0] || "";

	if (lines.length === 1) {
		return `${spaces}${marker}${firstLine}`;
	}

	const continuation = " ".repeat(marker.length);
	const rest = lines
		.slice(1)
		.map((line) => `${spaces}${continuation}${line.trimStart()}`);

	return [`${spaces}${marker}${firstLine}`, ...rest].join("\n");
}

// Format list item content handling nested blocks
function formatItemWithNestedBlocks(item: Node, _baseIndent: number): string {
	// Get block-level children
	const blocks = item.children.filter((c) => c.type === "element");

	if (blocks.length === 0) {
		return formatInline(item).trim();
	}

	// Filter out empty paragraphs and get text content
	const texts: string[] = [];

	for (const block of blocks) {
		let text = "";

		if (block.name === "p" || block.name === "paragraph") {
			text = formatParagraph(block).trim();
		} else if (block.name === "list") {
			// For nested lists, just format them
			text = formatList(block);
		} else {
			text = formatBlock(block).trim();
		}

		if (text) {
			texts.push(text);
		}
	}

	if (texts.length === 0) {
		return "";
	}

	if (texts.length === 1) {
		return texts[0];
	}

	// Multiple blocks - keep explicit block boundaries so reparsing does not
	// collapse them into a single paragraph.
	return texts.join("\n\n");
}

function formatDefinitionList(node: Node): string {
	const items = node.children.filter(
		(c) => c.type === "element" && c.name === "item",
	);
	const baseIndent = parseInt(node.attributes.get("_indent") || "0", 10);
	const termSpaces = " ".repeat(baseIndent);

	const formatted = items.map((item) => {
		const termNode = item.children.find(
			(c) => c.type === "element" && c.name === "term",
		);
		const defNode = item.children.find(
			(c) => c.type === "element" && c.name === "definition",
		);

		// For terms, just get the text content directly (don't format with underscores)
		const term = termNode ? formatChildren(termNode).trim() : "";
		const definition = defNode ? formatChildren(defNode).trim() : "";

		const termLine = `${termSpaces}${term}::`;

		if (definition) {
			// Indent definition by 3 spaces relative to base
			const defSpaces = " ".repeat(baseIndent + 3);
			const defLines = definition.split("\n");
			const indentedDef = defLines
				.map((line) => `${defSpaces}${line.replace(/[ \t]+$/g, "")}`)
				.join("\n");
			return `${termLine}\n\n${indentedDef}`;
		}

		return termLine;
	});

	return formatted.join("\n\n");
}

function formatParagraph(node: Node): string {
	return formatChildren(node);
}

function formatPreformatted(node: Node): string {
	const lang = node.attributes.get("data-lang") || "";
	const output = node.attributes.get("data-output") || "";
	const content = formatChildren(node);
	const format = node.attributes.get("_format") || "fenced"; // Default to fenced

	// Prefer fenced format, but respect captured format if present
	if (format === "fenced" || lang || output) {
		// Fenced format: ```lang > output
		let fence = "```";
		if (lang) {
			fence += lang;
		}
		if (output) {
			fence += ` > ${output}`;
		}
		return `${fence}\n${content}\n\`\`\``;
	}

	// Indented format: >   line1\n>   line2
	const lines = content.split("\n");
	const formatted = lines.map((line) => `>   ${line}`);
	return formatted.join("\n");
}

function formatTable(node: Node): string {
	// Tables are complex - simplified output
	const rows = node.children.filter(
		(c) => c.type === "element" && c.name === "row",
	);

	const formatted = rows.map((row) => {
		const cells = row.children.filter(
			(c) => c.type === "element" && c.name === "cell",
		);
		const cellTexts = cells.map(formatInline);
		return `| ${cellTexts.join(" | ")} |`;
	});

	return formatted.join("\n");
}

function formatTaggedBlock(node: Node): string {
	const tag = node.attributes.get("tag") || "Note";
	const content = formatChildren(node).trim();
	const indent = parseInt(node.attributes.get("_indent") || "0", 10);
	const spaces = " ".repeat(indent);

	// Build underline of appropriate length (at least 20 chars)
	const contentLength = content.split("\n")[0]?.length || 0;
	const minLength = Math.max(tag.length + 3, contentLength + 3, 20);
	const underline = "_".repeat(minLength);

	if (content) {
		return `${spaces}${tag}${underline}\n${content}\n${spaces}${underline}`;
	}

	return `${spaces}${tag}${underline}\n${spaces}${underline}`;
}

function formatLink(node: Node): string {
	const type = node.attributes.get("type") || "url";
	const target = node.attributes.get("target") || "";
	const text = formatChildren(node);

	if (type === "ref") {
		return `[${text}][${target}]`;
	}

	return `[${text}](${target})`;
}

function formatTarget(node: Node): string {
	const name = node.attributes.get("name") || "";
	const text = formatChildren(node);

	if (text && text !== name) {
		return `|${name}:${text}|`;
	}

	return `|${name}|`;
}

function formatMarkup(node: Node): string {
	const tag = node.attributes.get("tag") || "div";

	// Build attributes string
	const attrs: string[] = [];
	for (const [key, value] of node.attributes) {
		if (key !== "tag" && !key.startsWith("_")) {
			attrs.push(`${key}="${value}"`);
		}
	}

	const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
	const content = formatChildren(node);

	if (content) {
		return `<${tag}${attrStr}>${content}</${tag}>`;
	}

	return `<${tag}${attrStr} />`;
}
