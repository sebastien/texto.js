// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/index
// Defines the package public surface and re-exports parser, backend, formatter,
// profile, and utility entry points.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Texto Parser - Public API

// The implementation section intentionally contains no runtime code.
// This module is a typed barrel that re-exports the public API.

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export {
	type BackendFormat,
	type BackendOptions,
	getAvailableBackends,
	htmlBackend,
	jsonBackend,
	type OutputBackend,
	renderBackend,
	xmlBackend,
} from "./backends/index.ts";
export {
	type ApplyResult,
	apply,
	type DeleteOp,
	type Delta,
	type DeltaOp,
	type DiffChange,
	type DiffEngine,
	delta,
	type InsertOp,
	type RetainOp,
	revert,
	setDiffEngine,
} from "./delta.ts";
export {
	DocumentBuilder,
	type SectionEntry,
} from "./document/builder.ts";
export {
	appendChild,
	createComment,
	createElement,
	createText,
	getAttribute,
	isComment,
	isElement,
	isText,
	resetNodeIdCounter,
	setAttribute,
} from "./document/node.ts";
export {
	findChild,
	findChildren,
	findDescendants,
	getChildren,
	getElementsByName,
	getFirstChild,
	getLastChild,
} from "./document/tree.ts";
export {
	deserializeDocument,
	formatJSON,
	toJSON,
} from "./formatters/json.ts";
export { formatTexto } from "./formatters/texto.ts";
export {
	BaseBlockParser,
	type BlockParser,
} from "./parsers/block/base.ts";
export { BlockquoteParser } from "./parsers/block/blockquote.ts";
export { FencedBlockParser } from "./parsers/block/fenced.ts";
export { HeaderParser } from "./parsers/block/header.ts";
export { HorizontalRuleParser } from "./parsers/block/horizontal-rule.ts";
export { IndentedCodeParser } from "./parsers/block/indented-code.ts";
export { IndentedPreBlockParser } from "./parsers/block/indented-pre.ts";
export { ListParser } from "./parsers/block/list.ts";
export { ParagraphParser } from "./parsers/block/paragraph.ts";
export { ReferenceDefinitionParser } from "./parsers/block/reference-definition.ts";
export { SectionParser } from "./parsers/block/section.ts";
export {
	BaseInlineParser,
	type InlineParser,
} from "./parsers/inline/base.ts";
export { CodeParser } from "./parsers/inline/code.ts";
export { EmphasisParser } from "./parsers/inline/emphasis.ts";
export { EscapeParser } from "./parsers/inline/escape.ts";
export { ImageParser } from "./parsers/inline/image.ts";
export { LinkParser } from "./parsers/inline/link.ts";
export { TextParser } from "./parsers/inline/text.ts";
export { MarkdownParser } from "./parsers/markdown-parser.ts";
export { BlockParsingEngine } from "./parsing/block.ts";
export {
	type LinkEntry,
	ParsingContext,
	type TargetEntry,
} from "./parsing/context.ts";
export {
	applyAstPatches,
	IncrementalParser,
	init as initIncrementalParser,
} from "./parsing/incremental.ts";
export { InlineParsingEngine } from "./parsing/inline.ts";
export {
	type InlinePhase,
	isInlinePhase,
	isPostParsePhase,
	isPreParsePhase,
	type ParsingPhase,
	PhaseRegistry,
	type PhaseResult,
	type PostParsePhase,
	type PreParsePhase,
	ReferenceCollectionPhase,
} from "./parsing/phases/index.ts";
export {
	BLOCK_PRIORITIES,
	HIGH,
	HIGHEST,
	INLINE_PRIORITIES,
	LOW,
	LOWEST,
	NORMAL,
} from "./parsing/priority.ts";
export { ParserRegistry } from "./parsing/registry.ts";
export {
	createMarkdownParser,
	type MarkdownProfileOptions,
} from "./profiles/markdown.ts";
export { createTextoParser } from "./profiles/texto.ts";
export {
	type ParserOptions,
	TextoParser,
} from "./texto.ts";
export type {
	CLIArgs,
	CLIMeta,
	CLIParam,
	CLIParamError,
	CLIParams,
	CLIParamType,
} from "./utils/cli.ts";
export {
	args,
	help,
	iargs,
} from "./utils/cli.ts";
export { Cursor } from "./utils/cursor.ts";
export {
	countLeadingSpaces,
	expandTabs,
	getIndent,
	matchesIndent,
	removeLeadingSpaces,
} from "./utils/indent.ts";
export {
	createPosition,
	mergePositions,
} from "./utils/position.ts";
export type {
	AstPatch,
	BlockResult,
	Document,
	InlineMatch,
	Node,
	NodePath,
	ParseError,
	ParserState,
	Position,
	Priority,
	RecognitionInfo,
	TextEdit,
} from "./utils/types.ts";
export { TAB_SIZE } from "./utils/types.ts";

// EOF
