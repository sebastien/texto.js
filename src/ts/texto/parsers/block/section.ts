// Section block parser

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

export class SectionParser extends BaseBlockParser {
	constructor() {
		super("section", BLOCK_PRIORITIES.SECTION);
	}

	recognises(cursor: Cursor, _context: ParsingContext): RecognitionInfo | null {
		// Check for numbered section (1.2.3)
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Try numbered heading: 1. or 1.2. or 1.2.3.
		let pos = cursor.pos;
		let hasNumber = false;
		let dotCount = 0;

		while (pos < cursor.length) {
			// Read number or letter
			while (
				pos < cursor.length &&
				/[a-zA-Z0-9]/.test(cursor.slice(pos, pos + 1))
			) {
				hasNumber = true;
				pos++;
			}

			if (pos >= cursor.length || cursor.slice(pos, pos + 1) !== ".") {
				break;
			}

			dotCount++;
			pos++;
		}

		if (hasNumber && dotCount > 0) {
			// Found numbered section
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return { type: "section", style: "numbered", depth: dotCount };
		}

		// Try underlined section: text\n=== or text\n---
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		const _line = cursor.readLine();
		if (!cursor.isAtEnd()) {
			cursor.advance(); // skip newline
			const underline = cursor.readLine();

			if (/^[=-]+$/.test(underline) && underline.length >= 3) {
				cursor.pos = save.pos;
				cursor.lineNumber = save.lineNumber;
				cursor.columnNumber = save.columnNumber;
				const weight = underline.startsWith("==")
					? 2
					: underline.startsWith("--")
						? 1
						: 0;
				return { type: "section", style: "underline", weight };
			}
		}

		// Try hash headings: # ## ###
		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;

		let hashCount = 0;
		while (cursor.peek(hashCount) === "#") {
			hashCount++;
		}

		if (hashCount > 0 && hashCount <= 6 && cursor.peek(hashCount) === " ") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return { type: "section", style: "hash", depth: hashCount };
		}

		cursor.pos = save.pos;
		cursor.lineNumber = save.lineNumber;
		cursor.columnNumber = save.columnNumber;
		return null;
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		info: RecognitionInfo,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;

		// Parse heading text based on style
		let title = "";
		let depth = 1;
		let sectionWeight = 0;
		let titleStart = start;
		let titleStartLine = startLine;
		let titleStartColumn = startColumn;

		if (info.style === "numbered") {
			// Skip number prefix
			this.skipLeadingWhitespace(cursor);
			while (/[a-zA-Z0-9.]/.test(cursor.current() || "")) {
				cursor.advance();
			}
			this.skipLeadingWhitespace(cursor);

			// Read title until end of line
			titleStart = cursor.pos;
			titleStartLine = cursor.lineNumber;
			titleStartColumn = cursor.columnNumber;
			title = cursor.readLine();
			depth = (info.depth as number) || 1;
		} else if (info.style === "underline") {
			this.skipLeadingWhitespace(cursor);
			titleStart = cursor.pos;
			titleStartLine = cursor.lineNumber;
			titleStartColumn = cursor.columnNumber;
			title = cursor.readLine();
			sectionWeight = (info.weight as number) || 0;

			// Skip underline line
			if (!cursor.isAtEnd()) {
				cursor.advance(); // newline
				cursor.readLine();
			}

			depth = this.calculateDepth(title, sectionWeight, context);
		} else if (info.style === "hash") {
			// Skip hash markers
			while (cursor.current() === "#") {
				cursor.advance();
			}
			this.skipLeadingWhitespace(cursor);

			// Read title
			titleStart = cursor.pos;
			titleStartLine = cursor.lineNumber;
			titleStartColumn = cursor.columnNumber;
			title = cursor.readLine();
			depth = (info.depth as number) || 1;
		}

		const end = cursor.pos;
		const endLine = cursor.lineNumber;
		const endColumn = cursor.columnNumber;

		// Find parent section
		const indent = context.getIndentation(title);
		const parentContent = context.getParentSection(depth, indent);

		// Create section node with position
		context.builder.setCurrentNode(parentContent);

		const sectionNode = context.builder.createAndAppend(
			"section",
			{},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);
		sectionNode.attributes.set("depth", String(depth));
		sectionNode.attributes.set("_indent", String(indent));
		sectionNode.attributes.set("_style", info.style as string);
		if (info.style === "underline") {
			sectionNode.attributes.set("_weight", String(sectionWeight));
		} else if (info.style === "numbered") {
			// Generate the section number
			const sectionNumber = this.generateSectionNumber(context, depth);
			sectionNode.attributes.set("_number", sectionNumber);
		}

		// Generate ID from title
		const id = context.asKey(title, sectionNode);
		sectionNode.attributes.set("id", id);

		// Push section node to stack so children are added to it
		context.builder.pushNode(sectionNode);

		// Create title node with position (just the title line)
		const titleEnd = titleStart + title.length;
		const titleNode = context.builder.createAndAppend(
			"title",
			{},
			{
				start: titleStart,
				end: titleEnd,
				line: titleStartLine,
				column: titleStartColumn,
			},
		);
		const normalizedTitle = context.normaliseText(title);
		const textNode = createText(normalizedTitle, {
			start: titleStart,
			end: titleEnd,
			line: titleStartLine,
			column: titleStartColumn,
		});
		titleNode.children.push(textNode);

		// Create content node for section body
		const contentNode = context.builder.createAndAppend(
			"content",
			{},
			{
				start: end,
				end: end,
				line: endLine,
				column: endColumn,
			},
		);
		contentNode.attributes.set("_indent", String(indent));

		// Pop section, push content for subsequent blocks
		context.builder.popNode();
		context.pushSection(sectionNode, contentNode, depth, indent);
		context.builder.pushNode(contentNode);

		return {
			consumed: end - start,
			node: sectionNode,
		};
	}

	private generateSectionNumber(
		context: ParsingContext,
		depth: number,
	): string {
		// Generate a section number like "1.2.3" based on depth and current section count
		const current = context.getCurrentSection();

		// Get count of sections at this depth within parent
		const parentContent = context.getParentSection(depth, 0);
		const siblings = parentContent.children.filter(
			(c) => c.type === "element" && c.name === "section",
		);
		const sectionIndex = siblings.length + 1;

		if (depth === 1) {
			return String(sectionIndex);
		}

		// Build hierarchical number
		const parentNumber = current?.node.attributes.get("_number") || "";
		if (parentNumber) {
			return `${parentNumber}.${sectionIndex}`;
		}

		return String(sectionIndex);
	}

	private calculateDepth(
		_title: string,
		weight: number,
		context: ParsingContext,
	): number {
		// Calculate section depth based on nesting and weight
		const current = context.getCurrentSection();
		if (!current) {
			return 1;
		}

		let depth = current.depth + 1;

		// Adjust for underline weight
		if (weight === 2) {
			depth = Math.max(1, depth - 1);
		} else if (weight === 0) {
			depth = depth + 1;
		}

		return depth;
	}
}
