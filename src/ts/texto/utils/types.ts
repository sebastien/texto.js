// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/utils/types
// Implements the utils/types module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Core types and interfaces for Texto parser

interface Position {
	start: number;
	end: number;
	line: number;
	column: number;
	block?: number;
}

interface Node {
	id: number;
	type: "element" | "text" | "comment";
	name?: string;
	content?: string;
	attributes: Map<string, string>;
	children: Node[];
	position?: Position;
}

interface Document {
	type: "document";
	header: Node;
	content: Node;
	references: Node;
	appendices: Node;
}

interface RecognitionInfo {
	type: string;
	[key: string]: unknown;
}

interface BlockResult {
	consumed: number;
	node?: Node;
}

interface InlineMatch {
	start: number;
	end: number;
	content: string;
	[key: string]: unknown;
}

interface ParserState {
	bufferOffset: number;
	lineNumber: number;
	columnNumber: number;
}

interface ParseError {
	message: string;
	position: Position;
	severity: "error" | "warning";
}

interface TextEdit {
	offset: number;
	length: number;
	text: string;
}

type NodePath = number[];

type AstPatch =
	| {
			type: "UPDATE_OFFSETS";
			startOffset: number;
			delta: number;
			lineDelta: number;
			columnDelta: number;
	  }
	| {
			type: "REPLACE_NODE";
			path: NodePath;
			oldNode: Node;
			newNodes: Node[];
	  }
	| {
			type: "DELETE_NODE";
			path: NodePath;
			node: Node;
	  }
	| {
			type: "INSERT_NODE";
			path: NodePath;
			node: Node;
	  }
	| {
			type: "MOVE_NODE";
			fromPath: NodePath;
			toPath: NodePath;
	  }
	| {
			type: "UPDATE_ATTRIBUTE";
			path: NodePath;
			key: string;
			value: string | null;
	  };

const TAB_SIZE = 4;

enum Priority {
	HIGHEST = 0,
	HIGH = 10,
	NORMAL = 20,
	LOW = 30,
	LOWEST = 40,
}

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
	RecognitionInfo,
	TextEdit,
};
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { Priority, TAB_SIZE };

// EOF
