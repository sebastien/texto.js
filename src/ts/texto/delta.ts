// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/delta
// Implements the delta module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
interface RetainOp {
	retain: number;
}

interface InsertOp {
	insert: string;
}

interface DeleteOp {
	delete: number;
}

type DeltaOp = RetainOp | InsertOp | DeleteOp;
type Delta = DeltaOp[];

type DiffChange = [operation: number, text: string];
type DiffEngine = (oldtext: string, newtext: string) => DiffChange[];

interface ApplyResult {
	text: string;
	range: [number, number];
}

const clamp = (value: number, min: number, max: number): number => {
	if (value < min) {
		return min;
	}
	if (value > max) {
		return max;
	}
	return value;
};

const pushRetain = (ops: Delta, count: number): void => {
	if (count <= 0) {
		return;
	}
	const last = ops[ops.length - 1];
	if (last && "retain" in last) {
		last.retain += count;
		return;
	}
	ops.push({ retain: count });
};

const pushInsert = (ops: Delta, value: string): void => {
	if (!value) {
		return;
	}
	const last = ops[ops.length - 1];
	if (last && "insert" in last) {
		last.insert += value;
		return;
	}
	ops.push({ insert: value });
};

const pushDelete = (ops: Delta, count: number): void => {
	if (count <= 0) {
		return;
	}
	const last = ops[ops.length - 1];
	if (last && "delete" in last) {
		last.delete += count;
		return;
	}
	ops.push({ delete: count });
};

const hasRangeHints = (start?: number, end?: number): start is number => {
	return Number.isInteger(start) && Number.isInteger(end);
};

let diffEngine: DiffEngine | null = null;

const setDiffEngine = (engine: DiffEngine | null): void => {
	diffEngine = engine;
};

const applyDiffChanges = (ops: Delta, changes: DiffChange[]): void => {
	for (const [operation, text] of changes) {
		if (!text) {
			continue;
		}
		if (operation === 0) {
			pushRetain(ops, text.length);
			continue;
		}
		if (operation === 1) {
			pushInsert(ops, text);
			continue;
		}
		if (operation === -1) {
			pushDelete(ops, text.length);
			continue;
		}
		throw new Error("Invalid diff engine operation");
	}
};

const delta = (
	oldtext: string,
	newtext: string,
	start?: number,
	end?: number,
): Delta => {
	if (oldtext === newtext) {
		return [];
	}

	let prefix = 0;
	let oldEnd = oldtext.length;
	let newEnd = newtext.length;

	if (hasRangeHints(start, end)) {
		const boundedStart = clamp(
			start,
			0,
			Math.min(oldtext.length, newtext.length),
		);
		const boundedEnd = clamp(end, boundedStart, oldtext.length);

		prefix = boundedStart;
		while (
			prefix < boundedEnd &&
			prefix < newEnd &&
			oldtext[prefix] === newtext[prefix]
		) {
			prefix += 1;
		}

		while (
			oldEnd > boundedEnd &&
			newEnd > prefix &&
			oldtext[oldEnd - 1] === newtext[newEnd - 1]
		) {
			oldEnd -= 1;
			newEnd -= 1;
		}
	} else {
		const maxPrefix = Math.min(oldtext.length, newtext.length);
		while (prefix < maxPrefix && oldtext[prefix] === newtext[prefix]) {
			prefix += 1;
		}
	}

	while (
		oldEnd > prefix &&
		newEnd > prefix &&
		oldtext[oldEnd - 1] === newtext[newEnd - 1]
	) {
		oldEnd -= 1;
		newEnd -= 1;
	}

	const ops: Delta = [];
	pushRetain(ops, prefix);

	if (diffEngine) {
		const middleOld = oldtext.slice(prefix, oldEnd);
		const middleNew = newtext.slice(prefix, newEnd);
		applyDiffChanges(ops, diffEngine(middleOld, middleNew));
	} else {
		pushDelete(ops, oldEnd - prefix);
		pushInsert(ops, newtext.slice(prefix, newEnd));
	}

	pushRetain(ops, oldtext.length - oldEnd);
	return ops;
};

const apply = (text: string, patches: Delta): ApplyResult => {
	let sourceCursor = 0;
	let outputCursor = 0;
	let rangeMin = Number.POSITIVE_INFINITY;
	let rangeMax = -1;
	const out: string[] = [];

	const markRange = (start: number, end: number): void => {
		rangeMin = Math.min(rangeMin, start);
		rangeMax = Math.max(rangeMax, end);
	};

	for (const op of patches) {
		if ("retain" in op) {
			if (op.retain < 0) {
				throw new Error("Invalid retain operation");
			}
			out.push(text.slice(sourceCursor, sourceCursor + op.retain));
			sourceCursor += op.retain;
			outputCursor += op.retain;
			continue;
		}

		if ("insert" in op) {
			if (op.insert.length > 0) {
				markRange(outputCursor, outputCursor + op.insert.length);
				out.push(op.insert);
				outputCursor += op.insert.length;
			}
			continue;
		}

		if (op.delete < 0) {
			throw new Error("Invalid delete operation");
		}
		if (op.delete > 0) {
			markRange(outputCursor, outputCursor + op.delete);
			sourceCursor += op.delete;
		}
	}

	if (sourceCursor > text.length) {
		throw new Error("Patch exceeds input text length");
	}

	out.push(text.slice(sourceCursor));
	if (!Number.isFinite(rangeMin)) {
		return { text: out.join(""), range: [0, 0] };
	}
	return { text: out.join(""), range: [rangeMin, rangeMax] };
};

const revert = (oldtext: string, newtext: string, patches?: Delta): Delta => {
	if (!patches) {
		return delta(newtext, oldtext);
	}

	let oldCursor = 0;
	const inverse: Delta = [];

	for (const op of patches) {
		if ("retain" in op) {
			pushRetain(inverse, op.retain);
			oldCursor += op.retain;
			continue;
		}

		if ("insert" in op) {
			pushDelete(inverse, op.insert.length);
			continue;
		}

		const deleted = oldtext.slice(oldCursor, oldCursor + op.delete);
		pushInsert(inverse, deleted);
		oldCursor += op.delete;
	}

	return inverse;
};

export type {
	ApplyResult,
	DeleteOp,
	Delta,
	DeltaOp,
	DiffChange,
	DiffEngine,
	InsertOp,
	RetainOp,
};
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { apply, delta, revert, setDiffEngine };

// EOF
