// Core types and interfaces for Texto parser

export interface Position {
	start: number;
	end: number;
	line: number;
	column: number;
}

export interface Node {
	type: "element" | "text" | "comment";
	name?: string;
	content?: string;
	attributes: Map<string, string>;
	children: Node[];
	position?: Position;
}

export interface Document {
	type: "document";
	header: Node;
	content: Node;
	references: Node;
	appendices: Node;
}

export interface RecognitionInfo {
	type: string;
	[key: string]: unknown;
}

export interface BlockResult {
	consumed: number;
	node?: Node;
}

export interface InlineMatch {
	start: number;
	end: number;
	content: string;
	[key: string]: unknown;
}

export interface ParserState {
	bufferOffset: number;
	lineNumber: number;
	columnNumber: number;
}

export interface ParseError {
	message: string;
	position: Position;
	severity: "error" | "warning";
}

export const TAB_SIZE = 4;

export enum Priority {
	HIGHEST = 0,
	HIGH = 10,
	NORMAL = 20,
	LOW = 30,
	LOWEST = 40,
}
