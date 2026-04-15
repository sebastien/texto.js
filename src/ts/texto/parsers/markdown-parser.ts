// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsers/markdown-parser
// Implements the parsers/markdown-parser module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Markdown parser with reference definition pre-scanning
// Uses the phase-based parsing system for extensible processing

import type { BlockParser } from "../parsers/block/base.ts";
import type { InlineParser } from "../parsers/inline/base.ts";
import { ReferenceCollectionPhase } from "../parsing/phases/reference-collection.ts";
import { TextoParser } from "../texto.ts";

/**
 * Extended parser options for markdown.
 */
interface MarkdownParserOptions {
	/** Block parsers to use */
	blockParsers?: BlockParser[];
	/** Inline parsers to use */
	inlineParsers?: InlineParser[];
	/** Whether to enable fenced code blocks. Defaults to true. */
	enableFencedCode?: boolean;
}

/**
 * Markdown parser that uses the phase-based parsing system.
 * Automatically includes the ReferenceCollectionPhase for resolving
 * reference-style links and images.
 */
class MarkdownParser extends TextoParser {
	private referencePhase: ReferenceCollectionPhase;

	constructor(options: MarkdownParserOptions = {}) {
		// Create and configure the reference collection phase
		const referencePhase = new ReferenceCollectionPhase();

		super({
			blockParsers: options.blockParsers,
			inlineParsers: options.inlineParsers,
			preParsePhases: [referencePhase],
		});

		this.referencePhase = referencePhase;
	}

	/**
	 * Look up a reference by label.
	 * Useful for external tools that need to check reference definitions.
	 */
	lookupReference(label: string): { url: string; title: string } | undefined {
		return this.referencePhase.lookup(label);
	}

	/**
	 * Get all collected reference definitions.
	 */
	getReferences(): Map<string, { url: string; title: string; line: number }> {
		return this.referencePhase.getReferences();
	}
}

export type { MarkdownParserOptions };
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { MarkdownParser };

// EOF
