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
	formatJSON,
	toJSON,
} from "./formatters/json.ts";
export { formatTexto } from "./formatters/texto.ts";
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
// Inline parsers
export {
	BaseInlineParser,
	type InlineParser,
} from "./parsers/inline/base.ts";
export { EmphasisParser } from "./parsers/inline/emphasis.ts";
export { TextParser } from "./parsers/inline/text.ts";
export { BlockParsingEngine } from "./parsing/block.ts";
export {
	type LinkEntry,
	ParsingContext,
	type TargetEntry,
} from "./parsing/context.ts";
export { InlineParsingEngine } from "./parsing/inline.ts";
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
	ParseError,
	ParserState,
	Position,
	Priority,
	RecognitionInfo,
} from "./utils/types.ts";
// Constants
export { TAB_SIZE } from "./utils/types.ts";
