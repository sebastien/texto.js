// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/blockquote
// Implements the parsers/block/blockquote module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Blockquote block parser
// Handles lines prefixed with > character
// Supports nested blockquotes and multi-line content

import type { BlockParsingEngine } from "../../parsing/block.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

interface BlockquoteLine {
	content: string;
	level: number; // Number of > markers
}

class BlockquoteParser extends BaseBlockParser {
	constructor() {
		super("blockquote", BLOCK_PRIORITIES.TABLE + 1); // 28, after tables
	}

	recognises(cursor: Cursor, context: ParsingContext): RecognitionInfo | null {
		const save = cursor.clone();
		this.skipLeadingWhitespace(cursor);

		// Check for blockquote marker: >
		// Space after > is optional per original markdown spec
		if (cursor.current() === ">") {
			cursor.pos = save.pos;
			cursor.lineNumber = save.lineNumber;
			cursor.columnNumber = save.columnNumber;
			return { type: "blockquote" };
		}

		// Check if we're at a blank line that precedes a blockquote continuation
		// This allows blank lines within a blockquote to not break the blockquote
		const text = context.getText();
		const currentPos = cursor.pos;

		// Check if current line is blank
		const lineEnd = text.indexOf("\n", currentPos);
		const currentLine =
			lineEnd === -1 ? text.slice(currentPos) : text.slice(currentPos, lineEnd);

		if (currentLine.trim() === "") {
			// Current line is blank, check if next non-blank line is a blockquote
			let pos = lineEnd === -1 ? text.length : lineEnd + 1;

			while (pos < text.length) {
				const nextLineEnd = text.indexOf("\n", pos);
				const nextLine =
					nextLineEnd === -1 ? text.slice(pos) : text.slice(pos, nextLineEnd);

				const trimmed = nextLine.trimStart();
				if (trimmed.startsWith(">")) {
					// Found blockquote continuation after blank line
					cursor.pos = save.pos;
					cursor.lineNumber = save.lineNumber;
					cursor.columnNumber = save.columnNumber;
					return { type: "blockquote", continuation: true };
				}

				if (trimmed !== "") {
					// Found non-blank, non-blockquote line
					break;
				}

				// Skip blank line
				pos = nextLineEnd === -1 ? text.length : nextLineEnd + 1;
			}
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
		engine?: BlockParsingEngine,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;
		const text = context.getText();
		const blockEnd = context.getBlockEnd();

		// If this is a continuation blockquote (after blank lines),
		// skip to the first non-blank line
		if (info.continuation) {
			while (cursor.pos < blockEnd && !cursor.isAtEnd()) {
				const lineStart = cursor.pos;
				const lineEnd = text.indexOf("\n", cursor.pos);
				const line =
					lineEnd === -1
						? text.slice(lineStart)
						: text.slice(lineStart, lineEnd);

				if (line.trimStart().startsWith(">")) {
					// Found the blockquote line
					break;
				}

				// Skip this line and its newline
				if (lineEnd === -1) {
					cursor.pos = text.length;
					break;
				}
				cursor.pos = lineEnd + 1;
				cursor.lineNumber++;
				cursor.columnNumber = 0;
			}
		}

		// Collect all blockquote lines with their nesting levels
		const lines: BlockquoteLine[] = [];
		let iterations = 0;
		const maxIterations = 1000;

		while (
			cursor.pos < blockEnd &&
			!cursor.isAtEnd() &&
			iterations < maxIterations
		) {
			iterations++;

			const lineStartOffset = cursor.pos;

			// Skip leading whitespace
			this.skipLeadingWhitespace(cursor);

			// Count > markers (for nesting level)
			let level = 0;
			while (cursor.current() === ">") {
				level++;
				cursor.advance();
				// Skip one optional space after each >
				if (cursor.current() === " ") {
					cursor.advance();
				}
			}

			// If no > markers, this line doesn't belong to the blockquote
			if (level === 0) {
				cursor.pos = lineStartOffset;
				break;
			}

			// Read the rest of the line
			const lineContent = cursor.readLine();
			lines.push({ content: lineContent, level });
			// readLine() now consumes line endings automatically

			// Check if next line continues the blockquote
			if (cursor.pos < text.length) {
				const nextLineStart = cursor.pos;
				const nextLine = this.readLineFromText(text, nextLineStart).trimStart();

				// If next line doesn't start with >, check if it's a blank line
				if (!nextLine.startsWith(">")) {
					// If it's a blank line, check if there's another blockquote after
					if (nextLine === "") {
						// Position right after this blank line's newline
						const afterBlankPos = nextLineStart + nextLine.length + 1; // +1 for the newline
						if (afterBlankPos < text.length) {
							const afterLine = this.readLineFromText(
								text,
								afterBlankPos,
							).trimStart();
							if (afterLine.startsWith(">")) {
								// Blockquote continues after blank line - include the blank
								lines.push({ content: "", level: 1 });
								// Move cursor to the continuation line (skip the blank line's newline)
								cursor.pos = afterBlankPos;
								continue;
							}
						}
					}
					// Blockquote ends here
					break;
				}
			}
		}

		const end = cursor.pos;

		// Create blockquote node
		const node = context.builder.createAndAppend(
			"blockquote",
			{},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);

		// If we have content, parse it
		if (lines.length > 0 && context.parser) {
			context.builder.pushNode(node);

			// Process lines by nesting level
			this.processLines(lines, node, context, engine, start);

			context.builder.popNode();
		}

		return {
			consumed: end - start,
			node,
		};
	}

	/**
	 * Process blockquote lines, handling nesting levels and paragraph breaks
	 * Handles headers by detecting # at start of lines
	 */
	private processLines(
		lines: BlockquoteLine[],
		parentNode: Node,
		context: ParsingContext,
		_engine: BlockParsingEngine | undefined,
		startOffset: number,
	): void {
		const currentLevel = 1;
		let currentLines: string[] = [];
		const currentOffset = startOffset;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Check for paragraph break (empty line at the same level)
			if (line.level === currentLevel && line.content === "") {
				// Empty line indicates paragraph break
				if (currentLines.length > 0) {
					this.processBlockquoteContent(
						currentLines,
						parentNode,
						context,
						currentLevel,
					);
					currentLines = [];
				}
				continue;
			}

			if (line.level === currentLevel) {
				// Check if this line starts a header (# syntax)
				const headerMatch = line.content.match(/^(#{1,6})\s+(.+)$/);
				if (headerMatch && currentLines.length > 0) {
					// Flush current content before the header
					this.processBlockquoteContent(
						currentLines,
						parentNode,
						context,
						currentLevel,
					);
					currentLines = [];
				}

				if (headerMatch) {
					// Keep blockquote headings in the canonical section shape without
					// mixing them into the document-wide section stack.
					const level = headerMatch[1].length;
					const text = headerMatch[2];
					this.createSection(text, level, context, currentOffset);
				} else {
					// Same level - add to current content
					currentLines.push(line.content);
				}
			} else if (line.level > currentLevel) {
				// Nested level - first finish current level, then create nested blockquote
				if (currentLines.length > 0) {
					this.processBlockquoteContent(
						currentLines,
						parentNode,
						context,
						currentLevel,
					);
					currentLines = [];
				}

				// Create nested blockquote
				const nestedNode = context.builder.createAndAppend(
					"blockquote",
					{},
					{
						start: currentOffset,
						end: currentOffset,
						line: 0,
						column: 0,
					},
				);

				// Collect all nested lines.
				// Also support lazy continuation: a line at the parent level may
				// continue the nested paragraph when it directly follows nested content.
				const nestedLines: BlockquoteLine[] = [];
				while (i < lines.length) {
					const nestedLine = lines[i];

					if (nestedLine.level >= currentLevel + 1) {
						// Adjust level relative to the nested blockquote
						nestedLines.push({
							content: nestedLine.content,
							level: nestedLine.level - currentLevel,
						});
						i++;
						continue;
					}

					// Lazy continuation at parent level extends nested content.
					if (nestedLine.level === currentLevel && nestedLine.content !== "") {
						nestedLines.push({
							content: nestedLine.content,
							level: 1,
						});
						i++;
						continue;
					}

					break;
				}
				i--; // Step back one since outer loop will increment

				// Process nested content
				context.builder.pushNode(nestedNode);
				this.processLines(
					nestedLines,
					nestedNode,
					context,
					_engine,
					currentOffset,
				);
				context.builder.popNode();
			} else {
				// Lower level - shouldn't happen in normal parsing, but handle it
				currentLines.push(line.content);
			}
		}

		// Create final paragraph for remaining lines
		if (currentLines.length > 0) {
			this.processBlockquoteContent(
				currentLines,
				parentNode,
				context,
				currentLevel,
			);
		}
	}

	private createSection(
		title: string,
		depth: number,
		context: ParsingContext,
		offset: number,
	): void {
		const sectionNode = context.builder.createAndAppend(
			"section",
			{},
			{
				start: offset,
				end: offset,
				line: 0,
				column: 0,
			},
		);
		sectionNode.attributes.set("depth", String(depth));
		sectionNode.attributes.set("_style", "hash");

		context.builder.pushNode(sectionNode);
		const titleNode = context.builder.createAndAppend("title", {}, undefined);
		if (context.parser) {
			context.builder.pushNode(titleNode);
			context.parser.parseInlines(title, titleNode, context, offset);
			context.builder.popNode();
		}
		context.builder.createAndAppend("content", {}, undefined);
		context.builder.popNode();
	}

	/**
	 * Process content lines, creating paragraphs or other block elements
	 */
	private processBlockquoteContent(
		lines: string[],
		parentNode: Node,
		context: ParsingContext,
		_level: number,
	): void {
		if (lines.length === 0) return;

		// Join lines, preserving trailing spaces from original lines
		// In markdown, trailing spaces on lines are significant (2+ = hard break)
		let content = "";
		for (let i = 0; i < lines.length; i++) {
			if (i > 0) {
				// Add separator between lines
				// If previous line ends with space, don't add another
				const prevLine = lines[i - 1];
				if (!prevLine.endsWith(" ")) {
					content += " ";
				}
			}
			content += lines[i];
		}

		this.createParagraph(content, parentNode, context);
	}

	/**
	 * Create a paragraph node with inline content
	 */
	private createParagraph(
		content: string,
		_parentNode: Node,
		context: ParsingContext,
	): void {
		if (!content.trim()) return;

		const pNode = context.builder.createAndAppend(
			"paragraph",
			{},
			{
				start: 0,
				end: 0,
				line: 0,
				column: 0,
			},
		);

		if (context.parser) {
			context.builder.pushNode(pNode);
			// Preserve trailing whitespace by only trimming leading spaces
			// Trailing spaces may be intentional (e.g., "like this. ")
			const trimmedContent = content.trimStart();
			context.parser.parseInlines(trimmedContent, pNode, context, 0);
			context.builder.popNode();
		}
	}

	private readLineFromText(text: string, offset: number): string {
		const end = text.indexOf("\n", offset);
		if (end === -1) {
			return text.slice(offset);
		}
		return text.slice(offset, end);
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { BlockquoteParser };

// EOF
