// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsing/phases/reference-collection
// Implements the parsing/phases/reference-collection module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Pre-parse phase for collecting reference definitions
// Scans the input text for [ref]: url patterns before main parsing

import type { Node } from "../../utils/types.ts";
import type { ParsingContext } from "../context.ts";
import type { PhaseResult, PreParsePhase } from "./types.ts";

interface ReferenceDefinition {
	label: string;
	url: string;
	title: string;
	line: number;
}

/**
 * Pre-parse phase that collects all reference definitions.
 * This allows references to be defined after they're used in the document.
 */
class ReferenceCollectionPhase implements PreParsePhase {
	readonly name = "reference-collection";
	readonly phaseType = "pre-parse" as const;

	/** Collected references */
	private references: Map<string, ReferenceDefinition> = new Map();

	execute(
		input: string,
		_context: ParsingContext,
		_document: Node,
	): PhaseResult {
		// Clear any existing references
		this.references.clear();

		// Scan for reference definitions
		this.collectReferences(input);

		// Return collected references for use by subsequent phases
		const data = new Map<string, unknown>();
		data.set("references", this.references);

		return { data, continue: true };
	}

	/**
	 * Scan the input text and collect all reference definitions.
	 */
	private collectReferences(text: string): void {
		const lines = text.split("\n");
		let inCodeBlock = false;
		let codeBlockFence = "";

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Track fenced code blocks to skip reference detection inside them
			if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
				const fence = trimmed.slice(0, 3);
				if (!inCodeBlock) {
					inCodeBlock = true;
					codeBlockFence = fence;
				} else if (trimmed.startsWith(codeBlockFence)) {
					inCodeBlock = false;
					codeBlockFence = "";
				}
				continue;
			}

			// Skip lines inside code blocks
			if (inCodeBlock) {
				continue;
			}

			// Try to parse reference definition from this line
			const ref = this.parseReferenceDefinition(lines, i);
			if (ref) {
				// Normalize label: lowercase and collapse whitespace
				const normalizedLabel = ref.label
					.toLowerCase()
					.trim()
					.replace(/\s+/g, " ");
				this.references.set(normalizedLabel, ref);
				i += this.countConsumedLines(lines, i, ref) - 1;
			}
		}
	}

	/**
	 * Try to parse a reference definition at the given line.
	 * Returns the definition or null if not a valid reference.
	 */
	private parseReferenceDefinition(
		lines: string[],
		startIndex: number,
	): ReferenceDefinition | null {
		const firstLine = lines[startIndex];
		const trimmed = firstLine.trimStart();

		// Must start with [label]:
		const labelMatch = trimmed.match(/^\[([^\]]+)\]:\s*/);
		if (!labelMatch) {
			return null;
		}

		const label = labelMatch[1];
		let remaining = trimmed.slice(labelMatch[0].length);

		let url = "";
		let title = "";
		let _consumedLines = 1;

		// Extract URL (can be in angle brackets)
		if (remaining.startsWith("<")) {
			const urlEnd = remaining.indexOf(">", 1);
			if (urlEnd === -1) {
				return null; // Malformed URL
			}
			url = remaining.slice(1, urlEnd);
			remaining = remaining.slice(urlEnd + 1).trimStart();
		} else {
			// Plain URL - take until whitespace or end of line
			const urlMatch = remaining.match(/^[^\s]+/);
			if (urlMatch) {
				url = urlMatch[0];
				remaining = remaining.slice(url.length).trimStart();
			}
		}

		// No URL found - invalid reference
		if (!url) {
			return null;
		}

		// Check for title on same line
		if (remaining) {
			const titleResult = this.extractTitle(remaining);
			if (titleResult) {
				title = titleResult.title;
			}
		}

		// Check for title on subsequent lines
		if (!title && startIndex + 1 < lines.length) {
			const nextLine = lines[startIndex + 1];
			const nextTrimmed = nextLine.trim();

			// If next line starts with a quote, it's a title continuation
			if (
				nextTrimmed.startsWith('"') ||
				nextTrimmed.startsWith("'") ||
				nextTrimmed.startsWith("(")
			) {
				const titleResult = this.extractTitle(nextTrimmed);
				if (titleResult && !titleResult.remaining) {
					title = titleResult.title;
					_consumedLines++;
				}
			}
		}

		return {
			label,
			url,
			title,
			line: startIndex + 1,
		};
	}

	/**
	 * Extract title from text (handles quotes and parentheses).
	 */
	private extractTitle(
		text: string,
	): { title: string; remaining: string } | null {
		const trimmed = text.trim();

		if (trimmed.startsWith('"')) {
			// Double-quoted title
			const end = trimmed.indexOf('"', 1);
			if (end !== -1) {
				return {
					title: trimmed.slice(1, end),
					remaining: trimmed.slice(end + 1).trim(),
				};
			}
		} else if (trimmed.startsWith("'")) {
			// Single-quoted title
			const end = trimmed.indexOf("'", 1);
			if (end !== -1) {
				return {
					title: trimmed.slice(1, end),
					remaining: trimmed.slice(end + 1).trim(),
				};
			}
		} else if (trimmed.startsWith("(")) {
			// Parenthesized title
			const end = trimmed.indexOf(")", 1);
			if (end !== -1) {
				return {
					title: trimmed.slice(1, end),
					remaining: trimmed.slice(end + 1).trim(),
				};
			}
		}

		return null;
	}

	/**
	 * Count how many lines a reference definition consumes.
	 */
	private countConsumedLines(
		lines: string[],
		startIndex: number,
		ref: ReferenceDefinition,
	): number {
		let count = 1;

		// Check if there's a title on the next line
		if (startIndex + 1 < lines.length) {
			const nextLine = lines[startIndex + 1].trim();
			if (
				(nextLine.startsWith('"') ||
					nextLine.startsWith("'") ||
					nextLine.startsWith("(")) &&
				ref.title
			) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Get all collected references.
	 */
	getReferences(): Map<string, ReferenceDefinition> {
		return new Map(this.references);
	}

	/**
	 * Look up a reference by label.
	 */
	lookup(label: string): ReferenceDefinition | undefined {
		const normalized = label.toLowerCase().trim().replace(/\s+/g, " ");
		return this.references.get(normalized);
	}
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { ReferenceCollectionPhase };

// EOF
