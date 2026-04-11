// Paragraph block parser (default fallback)

import { createText } from "../../document/node.ts";
import type { ParsingContext } from "../../parsing/context.ts";
import { BLOCK_PRIORITIES } from "../../parsing/priority.ts";
import type { Cursor } from "../../utils/cursor.ts";
import type { BlockResult, RecognitionInfo } from "../../utils/types.ts";
import { BaseBlockParser } from "./base.ts";

export class ParagraphParser extends BaseBlockParser {
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

			// Move cursor past this line (the newline)
			const lineEndOffset = cursor.pos;
			if (!cursor.isAtEnd()) {
				cursor.advance(); // consume the newline
			}

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

				// If next line is blank, end after this line
				if (nextLineContent === "") {
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
			}

			// Check if we've reached end of block
			if (cursor.pos >= blockEnd) {
				break;
			}
		}

		const end = cursor.pos;

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

		if (lines.length > 0) {
			// Find the actual content start position (skip leading whitespace on first line)
			const firstLine = lines[0];
			const firstLineTrimmed = firstLine.trimStart();
			const leadingSpaces = firstLine.length - firstLineTrimmed.length;
			const contentStartOffset = linePositions[0].start + leadingSpaces;
			const contentStartLine = linePositions[0].lineStart;
			const contentStartColumn = leadingSpaces;

			// Join lines with spaces and normalize for the text content
			let content = lines.join(" ").trim();
			content = content.replace(/[ \t]+/g, " ");

			if (content) {
				// Calculate end position based on content length
				const contentEndOffset = contentStartOffset + content.length;
				const textNode = createText(content, {
					start: contentStartOffset,
					end: contentEndOffset,
					line: contentStartLine,
					column: contentStartColumn,
				});
				node.children.push(textNode);
			}
		}

		return {
			consumed: end - start,
			node,
		};
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
			} else if (char === "\n") {
				// Empty line
				break;
			} else {
				break;
			}
		}

		return indent;
	}

	private readLineFromText(text: string, offset: number): string {
		const end = text.indexOf("\n", offset);
		if (end === -1) {
			return text.slice(offset);
		}
		return text.slice(offset, end);
	}
}
