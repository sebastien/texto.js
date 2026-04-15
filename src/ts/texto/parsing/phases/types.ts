// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsing/phases/types
// Implements the parsing/phases/types module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Parsing phase interface for multi-phase document processing
// Enables composable parsing stages like reference collection, TOC generation, etc.

import type { ParsingContext } from "../parsing/context.ts";
import type { Node } from "../utils/types.ts";

/**
 * Interface for a parsing phase.
 * Each phase can inspect and modify the document during a specific stage of parsing.
 */
interface ParsingPhase {
	/** Unique identifier for this phase */
	readonly name: string;

	/**
	 * Execute this phase.
	 * @param input - The raw input text
	 * @param context - The parsing context (contains targets, links, etc.)
	 * @param document - The document being built (may be partial in early phases)
	 * @returns Optional modifications to apply
	 */
	execute(
		input: string,
		context: ParsingContext,
		document: Node,
	): PhaseResult | undefined | Promise<PhaseResult | undefined>;
}

/**
 * Result of a parsing phase execution.
 * Phases can return data to be used by subsequent phases.
 */
interface PhaseResult {
	/** Data to pass to subsequent phases */
	data?: Map<string, unknown>;
	/** Whether to continue to next phase */
	continue?: boolean;
	/** Errors to report */
	errors?: Array<{ message: string; line: number; column: number }>;
}

/**
 * Phase that runs before main parsing.
 * Used for collecting metadata like reference definitions.
 */
interface PreParsePhase extends ParsingPhase {
	/** Runs before document structure is created */
	readonly phaseType: "pre-parse";
}

/**
 * Phase that runs during inline parsing.
 * Used for transforming inline content.
 */
interface InlinePhase extends ParsingPhase {
	/** Runs during inline parsing */
	readonly phaseType: "inline";
}

/**
 * Phase that runs after main parsing.
 * Used for post-processing like TOC generation.
 */
interface PostParsePhase extends ParsingPhase {
	/** Runs after document structure is complete */
	readonly phaseType: "post-parse";
}

/**
 * Type guard for pre-parse phases
 */
function isPreParsePhase(phase: ParsingPhase): phase is PreParsePhase {
	return (phase as PreParsePhase).phaseType === "pre-parse";
}

/**
 * Type guard for inline phases
 */
function isInlinePhase(phase: ParsingPhase): phase is InlinePhase {
	return (phase as InlinePhase).phaseType === "inline";
}

/**
 * Type guard for post-parse phases
 */
function isPostParsePhase(phase: ParsingPhase): phase is PostParsePhase {
	return (phase as PostParsePhase).phaseType === "post-parse";
}

export type {
	InlinePhase,
	ParsingPhase,
	PhaseResult,
	PostParsePhase,
	PreParsePhase,
};
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { isInlinePhase, isPostParsePhase, isPreParsePhase };

// EOF
