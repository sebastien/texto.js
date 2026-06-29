// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/index
// Web / browser entry point (slim bundle).
// Core parser, profiles, document model, delta/incremental, and common renderers.
// Does NOT include CLI or HTML-to-Texto frontend (DOMish).

// -----------------------------------------------------------------------------
// Backends (renderers)
// -----------------------------------------------------------------------------

export {
	type BackendFormat,
	type BackendOptions,
	getAvailableBackends,
	htmlBackend,
	jsonBackend,
	markdownBackend,
	type OutputBackend,
	renderBackend,
	textoBackend,
	xmlBackend,
} from "./backends/index.ts";

export {
	deserializeDocument,
	formatJSON,
	toJSON,
} from "./backends/json.ts";

export { formatMarkdown } from "./backends/markdown.ts";
export { formatTexto } from "./backends/texto.ts";

// High-level format: primary entry for rendering a Document to a target format
import { renderBackend } from "./backends/index.ts";
import type { BackendOptions } from "./backends/types.ts";

function format(doc: Document, format: string, options: BackendOptions = {}): string {
	return renderBackend(doc, format, options);
}

export { format };

// -----------------------------------------------------------------------------
// Delta / OT
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Document model
// -----------------------------------------------------------------------------

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
	hasAttribute,
	isComment,
	isElement,
	isText,
	removeAttribute,
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

// -----------------------------------------------------------------------------
// Frontends (web-safe: texto + markdown only)
// -----------------------------------------------------------------------------

import { markdownFrontend } from "./frontends/markdown.ts";
import { textoFrontend } from "./frontends/texto.ts";
import type { FrontendOptions, InputFrontend } from "./frontends/types.ts";
import { Registry } from "./utils/registry.ts";
import type { Document } from "./utils/types.ts";

export { markdownFrontend } from "./frontends/markdown.ts";
export { textoFrontend } from "./frontends/texto.ts";
export type { FrontendOptions, InputFrontend };

// Web-safe frontends (no html frontend / DOM dependency) using common Registry
const WEB_FRONTENDS = new Registry<string, InputFrontend>();
WEB_FRONTENDS.register("texto", textoFrontend);
WEB_FRONTENDS.register("markdown", markdownFrontend);
WEB_FRONTENDS.register("md", markdownFrontend);

type FrontendFormat = string;

function getAvailableFrontends(): FrontendFormat[] {
	return WEB_FRONTENDS.keys();
}

// High-level parse: primary entry for turning source text into a Document
function parse(
	input: string,
	format: string,
	options: FrontendOptions = {},
): Document {
	return parseFrontend(input, format, options);
}

function parseFrontend(
	input: string,
	format: string,
	options: FrontendOptions = {},
): Document {
	const normalized = format.toLowerCase();
	const frontend = WEB_FRONTENDS.get(normalized);
	if (!frontend) {
		const available = getAvailableFrontends().join(", ");
		throw new Error(
			`Unknown input type: ${format}. Available frontends: ${available}`,
		);
	}
	return frontend(input, options);
}

export type { FrontendFormat };
export { getAvailableFrontends, parse, parseFrontend };

// -----------------------------------------------------------------------------
// Parsers (block)
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Parsers (inline)
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Markdown parser class + engine pieces
// -----------------------------------------------------------------------------

export { MarkdownParser } from "./parsers/markdown-parser.ts";
export { BlockParsingEngine } from "./parsing/block.ts";

export {
	type LinkEntry,
	ParsingContext,
	type TargetEntry,
} from "./parsing/context.ts";

// Incremental (editor use case)
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
	Priority,
} from "./parsing/priority.ts";

export { ParserRegistry } from "./parsing/registry.ts";

// -----------------------------------------------------------------------------
// Profiles
// -----------------------------------------------------------------------------

export {
	createMarkdownParser,
	type MarkdownProfileOptions,
} from "./profiles/markdown.ts";
export { createTextoParser } from "./profiles/texto.ts";

// -----------------------------------------------------------------------------
// Core parser
// -----------------------------------------------------------------------------

export {
	type ParserOptions,
	TextoParser,
} from "./texto.ts";

// -----------------------------------------------------------------------------
// Utils (non-CLI)
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Advanced / extension surface (for custom parsers, phases, registries, etc.)
// High-level usage should prefer: parse, format, createTextoParser, createMarkdownParser
// -----------------------------------------------------------------------------

export { Registry } from "./utils/registry.ts";

// EOF
