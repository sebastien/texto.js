// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/utils/position
// Implements the utils/position module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Position tracking utilities

import type { Position } from "./types.ts";

function createPosition(
	start: number,
	end: number,
	line: number,
	column: number,
): Position {
	return { start, end, line, column };
}

function mergePositions(positions: Position[]): Position | undefined {
	if (positions.length === 0) return undefined;

	const start = Math.min(...positions.map((p) => p.start));
	const end = Math.max(...positions.map((p) => p.end));
	const first = positions[0];

	return {
		start,
		end,
		line: first.line,
		column: first.column,
	};
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { createPosition, mergePositions };

// EOF
