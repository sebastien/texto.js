// Position tracking utilities

import type { Position } from "./types.ts";

export function createPosition(
	start: number,
	end: number,
	line: number,
	column: number,
): Position {
	return { start, end, line, column };
}

export function mergePositions(positions: Position[]): Position | undefined {
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
