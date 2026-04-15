// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/block/paragraph
// Implements the parsers/block/paragraph module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Paragraph block parser (default fallback)

import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, Node, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

class ParagraphParser extends BaseBlockParser {
	constructor() {
		super("paragraph", BLOCK_PRIORITIES.PARAGRAPH);
	}

	recognises(
		_cursor: Cursor,
		_context: ParsingContext,
	): RecognitionInfo | null {
		// Paragraph parser always recognises any non-empty content
		return { type: "paragraph" };
	}

	process(
		cursor: Cursor,
		context: ParsingContext,
		_info: RecognitionInfo,
	): BlockResult {
		const start = cursor.pos;
		const startLine = cursor.lineNumber;
		const startColumn = cursor.columnNumber;
		const blockEnd = context.getBlockEnd();
		const text = context.getText();

		// Collect lines until we hit a paragraph boundary
		const lines: string[] = [];
		const linePositions: {
			start: number;
			end: number;
			lineStart: number;
			lineEnd: number;
		}[] = [];
		let iterations = 0;
		const maxIterations = 100;

		// Get base indentation from first line
		const firstLineIndent = this.getLineIndent(text, start);

		while (
			cursor.pos < blockEnd &&
			!cursor.isAtEnd() &&
			iterations < maxIterations
		) {
			iterations++;

			const lineStartOffset = cursor.pos;
			const lineStartLine = cursor.lineNumber;
			const _lineStartColumn = cursor.columnNumber;
			const line = cursor.readLine();

			// readLine() now consumes line endings (\n, \r, or \r\n)
			// so we don't need to advance past them manually
			const lineEndOffset = cursor.pos;

			// Skip empty lines at the start
			if (lines.length === 0 && line.trim() === "") {
				continue;
			}

			// Check if this line is blank (ends the paragraph)
			if (line.trim() === "") {
				// Restore cursor to before the blank line
				cursor.pos = lineStartOffset;
				break;
			}

			// Check if this line is an indented code block (4+ spaces)
			// If so, end the paragraph before this line so the code block can be parsed separately
			// Note: We check even for the first line after a blank line (when lines.length === 0)
			// because the blank line was just skipped
			const lineIndent = this.getLineIndent(text, lineStartOffset);
			if (lineIndent >= 4) {
				// This line is an indented code block - end paragraph before it
				cursor.pos = lineStartOffset;
				break;
			}

			lines.push(line);
			linePositions.push({
				start: lineStartOffset,
				end: lineEndOffset,
				lineStart: lineStartLine,
				lineEnd: cursor.lineNumber,
			});

			// Check if next line exists and would end the paragraph
			if (cursor.pos < text.length) {
				const nextLineStart = cursor.pos;
				const nextLineIndent = this.getLineIndent(text, nextLineStart);
				const nextLineContent = this.readLineFromText(
					text,
					nextLineStart,
				).trim();
				const nextLineFull = this.readLineFromText(text, nextLineStart);
				const tableBorderLine = /^\s*={3,}\s*$/.test(nextLineFull);

				// If next line is blank, end after this line
				if (nextLineContent === "") {
					break;
				}

				// If next line is a table border (===...), end paragraph
				if (tableBorderLine) {
					break;
				}

				// If next line is significantly less indented, end paragraph
				if (nextLineIndent < firstLineIndent - 2) {
					break;
				}

				// If next line looks like a list item at same or less indent, end paragraph
				// Check for " - " or "* " or "1) " patterns
				const listMarkerMatch = /^\s*([-_*]|\[\s\]|\[[xX]\]|\d+[.)])\s/.test(
					nextLineFull,
				);
				if (listMarkerMatch && nextLineIndent <= firstLineIndent + 2) {
					break;
				}

				// If next line is an indented code block (4+ spaces), end paragraph
				// This allows code blocks to be parsed separately
				if (nextLineIndent >= 4) {
					break;
				}
			}

			// Check if we've reached end of block
			if (cursor.pos >= blockEnd) {
				break;
			}
		}

		const end = cursor.pos;

		// Skip creating empty paragraphs
		if (lines.length === 0) {
			return {
				consumed: end - start,
				node: null as any, // Return null node for empty paragraphs
			};
		}

		// Create paragraph node with position
		const node = context.builder.createAndAppend(
			"p",
			{},
			{
				start,
				end,
				line: startLine,
				column: startColumn,
			},
		);

		if (context.parser) {
			// Find the actual content start position (skip leading whitespace on first line)
			const firstLine = lines[0];
			const firstLineTrimmed = firstLine.trimStart();
			const leadingSpaces = firstLine.length - firstLineTrimmed.length;
			const contentStartOffset = linePositions[0].start + leadingSpaces;

			// Process lines, detecting hard line breaks (lines ending with 2+ spaces)
			// and joining them appropriately
			let content = "";
			let hasHardBreaks = false;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (i > 0) {
					// Check if previous line ended with 2+ spaces (hard line break)
					const prevLine = lines[i - 1];
					if (/ {2}\s*$/.test(prevLine)) {
						// Hard line break - insert special marker
						content += "\n"; // Use newline as marker for hard break
						hasHardBreaks = true;
					} else {
						// Soft break - join with space
						content += " ";
					}
				}
				// For all lines except the last, trim trailing whitespace
				// For the last line, preserve trailing spaces as they may be significant
				if (i < lines.length - 1) {
					content += line.trim();
				} else {
					// Last line: trim leading spaces but preserve trailing spaces
					const trimmed = line.trimStart();
					content += trimmed;
				}
			}

			// Only trim leading whitespace from the entire content
			// Preserve trailing whitespace as it may be intentional
			content = content.trimStart();
			// Collapse multiple internal spaces/tabs to single spaces, but preserve trailing
			const trailingMatch = content.match(/[ \t]+$/);
			const trailingSpaces = trailingMatch ? trailingMatch[0] : "";
			content = content.replace(/[ \t]+/g, " ") + trailingSpaces;

			if (content) {
				// Set paragraph as current node for inline parsing
				context.builder.pushNode(node);

				// If we have hard breaks, parse line by line
				if (hasHardBreaks) {
					this.parseWithLineBreaks(content, node, context, contentStartOffset);
				} else {
					// Parse inline elements (emphasis, strong, etc.)
					context.parser.parseInlines(
						content,
						node,
						context,
						contentStartOffset,
					);
				}

				// Restore previous current node
				context.builder.popNode();
			}
		}

		return {
			consumed: end - start,
			node,
		};
	}

	/**
	 * Parse paragraph content that contains hard line breaks.
	 * The content has newlines as markers for hard breaks.
	 */
	private parseWithLineBreaks(
		content: string,
		node: Node,
		context: ParsingContext,
		baseOffset: number,
	): void {
		const lines = content.split("\n");
		let currentOffset = baseOffset;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line) {
				// Parse inline content for this line
				context.parser?.parseInlines(line, node, context, currentOffset);
			}

			// Add line break after each line except the last
			if (i < lines.length - 1) {
				context.builder.createAndAppend(
					"br",
					{},
					{
						start: currentOffset,
						end: currentOffset,
						line: 0,
						column: 0,
					},
				);
			}

			// Update offset for next line
			currentOffset += line.length + 1; // +1 for the newline
		}
	}

	private getLineIndent(text: string, offset: number): number {
		let indent = 0;
		let pos = offset;

		while (pos < text.length) {
			const char = text[pos];
			if (char === " ") {
				indent++;
				pos++;
			} else if (char === "\t") {
				indent += 4;
				pos++;
			} else if (char === "\n" || char === "\r") {
				// Empty line (any line ending type)
				break;
			} else {
				break;
			}
		}

		return indent;
	}

	private readLineFromText(text: string, offset: number): string {
		// Find the next line ending: \n (LF), \r\n (CRLF), or \r (CR)
		const lfPos = text.indexOf("\n", offset);
		const crPos = text.indexOf("\r", offset);

		let end: number;
		if (lfPos === -1 && crPos === -1) {
			// No line ending found
			return text.slice(offset);
		} else if (crPos === -1 || (lfPos !== -1 && lfPos < crPos)) {
			// LF comes first (or no CR)
			end = lfPos;
		} else {
			// CR comes first (or no LF)
			end = crPos;
		}

		return text.slice(offset, end);
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { ParagraphParser };

// EOF
