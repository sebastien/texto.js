// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/parsing/phases/index
// Exposes the parsing/phases module entry points.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Parsing phases - Multi-phase document processing system
// Enables composable parsing stages for references, TOC, post-processing, etc.

export { ReferenceCollectionPhase } from "./reference-collection.ts";
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { PhaseRegistry } from "./registry.ts";
export type {
	InlinePhase,
	ParsingPhase,
	PhaseResult,
	PostParsePhase,
	PreParsePhase,
} from "./types.ts";
export {
	isInlinePhase,
	isPostParsePhase,
	isPreParsePhase,
} from "./types.ts";

// EOF
