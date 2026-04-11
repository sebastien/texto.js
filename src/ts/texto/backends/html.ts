import type { Document, Node } from "../utils/types.ts";
import type { OutputBackend } from "./types.ts";

function escapeHTML(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderChildren(node: Node): string {
	return node.children.map((child) => renderNode(child)).join("");
}

function renderList(node: Node): string {
	const type = node.attributes.get("type") || "unordered";
	const items = node.children.filter(
		(child) => child.type === "element" && child.name === "item",
	);

	if (type === "definition") {
		const entries = items
			.map((item) => {
				const term = item.children.find(
					(child) => child.type === "element" && child.name === "term",
				);
				const definition = item.children.find(
					(child) => child.type === "element" && child.name === "definition",
				);
				const dt = term ? `<dt>${renderChildren(term)}</dt>` : "";
				const dd = definition
					? `<dd>${renderChildren(definition)}</dd>`
					: "<dd></dd>";
				return `${dt}${dd}`;
			})
			.join("");
		return `<dl>${entries}</dl>`;
	}

	const listTag = type === "ordered" ? "ol" : "ul";
	const body = items.map((item) => `<li>${renderChildren(item)}</li>`).join("");
	return `<${listTag}>${body}</${listTag}>`;
}

function renderTable(node: Node): string {
	const rows = node.children.filter(
		(child) => child.type === "element" && child.name === "row",
	);
	const body = rows
		.map((row) => {
			const cells = row.children
				.filter((cell) => cell.type === "element" && cell.name === "cell")
				.map((cell) => `<td>${renderChildren(cell)}</td>`)
				.join("");
			return `<tr>${cells}</tr>`;
		})
		.join("");
	return `<table><tbody>${body}</tbody></table>`;
}

function renderSection(node: Node): string {
	const depth = Math.min(
		6,
		Math.max(1, parseInt(node.attributes.get("depth") || "1", 10)),
	);
	const title = node.children.find(
		(child) => child.type === "element" && child.name === "title",
	);
	const content = node.children.find(
		(child) => child.type === "element" && child.name === "content",
	);

	const heading = title
		? `<h${depth}>${renderChildren(title)}</h${depth}>`
		: "";
	const body = content
		? renderChildren(content)
		: node.children
				.filter((child) => child.type !== "element" || child.name !== "title")
				.map((child) => renderNode(child))
				.join("");

	return `<section>${heading}${body}</section>`;
}

function renderNode(node: Node): string {
	if (node.type === "text") {
		return escapeHTML(node.content || "");
	}

	if (node.type === "comment") {
		return "";
	}

	const name = node.name || "";

	switch (name) {
		case "document":
		case "header":
		case "content":
		case "references":
		case "appendices":
			return renderChildren(node);

		case "section":
			return renderSection(node);

		case "p":
		case "paragraph":
			return `<p>${renderChildren(node)}</p>`;

		case "strong":
			return `<strong>${renderChildren(node)}</strong>`;

		case "em":
		case "emphasis":
			return `<em>${renderChildren(node)}</em>`;

		case "code":
			return `<code>${renderChildren(node)}</code>`;

		case "pre":
		case "preformatted": {
			const lang = node.attributes.get("data-lang");
			const classAttr = lang ? ` class="language-${escapeHTML(lang)}"` : "";
			return `<pre><code${classAttr}>${escapeHTML(renderChildren(node))}</code></pre>`;
		}

		case "list":
			return renderList(node);

		case "item":
			return `<li>${renderChildren(node)}</li>`;

		case "table":
			return renderTable(node);

		case "link": {
			const target = escapeHTML(node.attributes.get("target") || "");
			return `<a href="${target}">${renderChildren(node)}</a>`;
		}

		case "target": {
			const name = escapeHTML(node.attributes.get("name") || "");
			return `<a id="${name}"></a>`;
		}

		default:
			return `<div data-texto-name="${escapeHTML(name)}">${renderChildren(node)}</div>`;
	}
}

export const htmlBackend: OutputBackend = (doc: Document): string => {
	const titleNode = doc.header.children.find(
		(child) => child.type === "element" && child.name === "title",
	);
	const titleText = titleNode ? renderChildren(titleNode) : "Texto Document";
	const body = renderChildren(doc.content);

	return [
		"<!doctype html>",
		'<html lang="en">',
		"<head>",
		'  <meta charset="utf-8" />',
		`  <title>${titleText}</title>`,
		"</head>",
		"<body>",
		body,
		"</body>",
		"</html>",
	].join("\n");
};
