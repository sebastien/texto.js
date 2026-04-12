// Parsing phases - Multi-phase document processing system
// Enables composable parsing stages for references, TOC, post-processing, etc.

export { PhaseRegistry } from "./registry.ts";

export { ReferenceCollectionPhase } from "./reference-collection.ts";

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
