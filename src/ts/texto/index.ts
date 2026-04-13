// Texto Parser - Public API

// Output backends
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
	DocumentBuilder,
	type SectionEntry,
} from "./document/builder.ts";

export {
	appendChild,
	createComment,
	createElement,
	createText,
	resetNodeIdCounter,
	getAttribute,
	isComment,
	isElement,
	isText,
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
// Formatters
export {
	deserializeDocument,
	formatJSON,
	toJSON,
} from "./formatters/json.ts";
export { formatTexto } from "./formatters/texto.ts";
// Profiles
export { createTextoParser } from "./profiles/texto.ts";
export {
	createMarkdownParser,
	type MarkdownProfileOptions,
} from "./profiles/markdown.ts";
export { MarkdownParser } from "./parsers/markdown-parser.ts";

// Phases (multi-phase parsing system)
export {
	PhaseRegistry,
	ReferenceCollectionPhase,
	isInlinePhase,
	isPostParsePhase,
	isPreParsePhase,
	type InlinePhase,
	type ParsingPhase,
	type PhaseResult,
	type PostParsePhase,
	type PreParsePhase,
} from "./parsing/phases/index.ts";
// Block parsers
export {
	BaseBlockParser,
	type BlockParser,
} from "./parsers/block/base.ts";
export { FencedBlockParser } from "./parsers/block/fenced.ts";
export { IndentedPreBlockParser } from "./parsers/block/indented-pre.ts";
export { ListParser } from "./parsers/block/list.ts";
export { ParagraphParser } from "./parsers/block/paragraph.ts";
export { SectionParser } from "./parsers/block/section.ts";
export { HeaderParser } from "./parsers/block/header.ts";
export { BlockquoteParser } from "./parsers/block/blockquote.ts";
export { IndentedCodeParser } from "./parsers/block/indented-code.ts";
export { HorizontalRuleParser } from "./parsers/block/horizontal-rule.ts";
export { ReferenceDefinitionParser } from "./parsers/block/reference-definition.ts";
// Inline parsers
export {
	BaseInlineParser,
	type InlineParser,
} from "./parsers/inline/base.ts";
export { EmphasisParser } from "./parsers/inline/emphasis.ts";
export { TextParser } from "./parsers/inline/text.ts";
export { CodeParser } from "./parsers/inline/code.ts";
export { LinkParser } from "./parsers/inline/link.ts";
export { ImageParser } from "./parsers/inline/image.ts";
export { EscapeParser } from "./parsers/inline/escape.ts";
export { BlockParsingEngine } from "./parsing/block.ts";
export {
	type LinkEntry,
	ParsingContext,
	type TargetEntry,
} from "./parsing/context.ts";
export { InlineParsingEngine } from "./parsing/inline.ts";
export {
	applyAstPatches,
	IncrementalParser,
	init as initIncrementalParser,
} from "./parsing/incremental.ts";
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
	type ParserOptions,
	TextoParser,
} from "./texto.ts";
// CLI utilities
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
// Types
export type {
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
	AstPatch,
	TextEdit,
} from "./utils/types.ts";
// Constants
export { TAB_SIZE } from "./utils/types.ts";
