// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/utils/cursor
// Implements the utils/cursor module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Character cursor for navigation through input

import type { Position } from "./types.ts";

class Cursor {
	private buffer: string;
	private _position: number;
	private _line: number;
	private _column: number;

	constructor(buffer: string, startOffset: number = 0) {
		this.buffer = buffer;
		this._position = startOffset;
		this._line = 1;
		this._column = 0;
	}

	/**
	 * Get the full text buffer
	 */
	get text(): string {
		return this.buffer;
	}

	get length(): number {
		return this.buffer.length;
	}

	get pos(): number {
		return this._position;
	}

	set pos(value: number) {
		this._position = value;
	}

	get lineNumber(): number {
		return this._line;
	}

	set lineNumber(value: number) {
		this._line = value;
	}

	get columnNumber(): number {
		return this._column;
	}

	set columnNumber(value: number) {
		this._column = value;
	}

	peek(offset: number = 0): string | null {
		const idx = this._position + offset;
		if (idx < 0 || idx >= this.buffer.length) {
			return null;
		}
		return this.buffer[idx];
	}

	current(): string | null {
		return this.peek(0);
	}

	lookahead(n: number): string {
		let result = "";
		for (let i = 0; i < n; i++) {
			const char = this.peek(i);
			if (char === null) break;
			result += char;
		}
		return result;
	}

	advance(count: number = 1): void {
		for (let i = 0; i < count; i++) {
			const char = this.peek();
			if (char === null) break;

			this._position++;
			if (char === "\n") {
				this._line++;
				this._column = 0;
			} else {
				this._column++;
			}
		}
	}

	retreat(count: number = 1): void {
		for (let i = 0; i < count; i++) {
			if (this._position <= 0) break;

			this._position--;
			const char = this.peek();
			if (char === "\n") {
				// Count back to find line start
				this._line--;
				let col = 0;
				let j = this._position - 1;
				while (j >= 0 && this.buffer[j] !== "\n") {
					col++;
					j--;
				}
				this._column = col;
			} else {
				this._column = Math.max(0, this._column - 1);
			}
		}
	}

	match(str: string): boolean {
		if (this._position + str.length > this.buffer.length) {
			return false;
		}

		for (let i = 0; i < str.length; i++) {
			if (this.buffer[this._position + i] !== str[i]) {
				return false;
			}
		}

		return true;
	}

	skipWhitespace(): void {
		while (this._position < this.buffer.length) {
			const char = this.buffer[this._position];
			if (char !== " " && char !== "\t" && char !== "\r") {
				break;
			}
			this.advance();
		}
	}

	skipNewlines(): void {
		while (this._position < this.buffer.length) {
			const char = this.buffer[this._position];
			if (char !== "\n" && char !== "\r") {
				break;
			}
			this.advance();
		}
	}

	readUntil(predicate: (char: string) => boolean): string {
		let result = "";
		while (this._position < this.buffer.length) {
			const char = this.buffer[this._position];
			if (predicate(char)) {
				break;
			}
			result += char;
			this.advance();
		}
		return result;
	}

	readLine(): string {
		const line = this.readUntil((char) => char === "\n" || char === "\r");
		// Handle line endings: \n (LF), \r\n (CRLF), or \r (CR)
		if (this.current() === "\r") {
			this.advance(); // consume \r
			// If \r is followed by \n (CRLF), consume the \n too
			if (this.current() === "\n") {
				this.advance();
			}
		} else if (this.current() === "\n") {
			this.advance(); // consume \n (LF)
		}
		return line;
	}

	slice(start: number, end: number): string {
		return this.buffer.slice(start, end);
	}

	isAtEnd(): boolean {
		return this._position >= this.buffer.length;
	}

	getPosition(): Position {
		return {
			start: this._position,
			end: this._position,
			line: this._line,
			column: this._column,
		};
	}

	/**
	 * Creates a Position object for a range from start to current position.
	 * Uses the cursor's current line and column for the start position.
	 * For accurate line/column at end, you may need to track separately.
	 */
	getPositionRange(startOffset: number, endOffset?: number): Position {
		// Calculate line/column at start offset by walking back
		let line = this._line;
		let column = this._column;

		// Walk backwards from current position to find line/column at startOffset
		for (let i = this._position - 1; i >= startOffset && i >= 0; i--) {
			if (this.buffer[i] === "\n") {
				line--;
				// Count column from line start
				column = 0;
				let j = i + 1;
				while (j < this._position && this.buffer[j] !== "\n") {
					column++;
					j++;
				}
			}
		}

		// For the end position, use current line/column if endOffset is current position
		const end = endOffset !== undefined ? endOffset : this._position;
		const _endLine = end === this._position ? this._line : line;
		const _endColumn =
			end === this._position ? this._column : column + (end - startOffset);

		return {
			start: startOffset,
			end: end,
			line: line,
			column: column,
		};
	}

	clone(): Cursor {
		const clone = new Cursor(this.buffer, this._position);
		clone._line = this._line;
		clone._column = this._column;
		return clone;
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { Cursor };

// EOF
