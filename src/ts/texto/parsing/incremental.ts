import { TextoParser } from "../texto.ts";
import { DocumentBuilder } from "../document/builder.ts";
import { annotateBlockStructure } from "./block-structure.ts";
import { ParsingContext } from "./context.ts";
import type { Delta, DeltaOp } from "../delta.ts";
import type { AstPatch, Document, Node, TextEdit } from "../utils/types.ts";

const SECTION_ORDER = [
	"header",
	"content",
	"references",
	"appendices",
] as const;

function isTextEdit(value: unknown): value is TextEdit {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Partial<TextEdit>;
	return (
		typeof candidate.offset === "number" &&
		typeof candidate.length === "number" &&
		typeof candidate.text === "string"
	);
}

function isDeltaOp(value: unknown): value is DeltaOp {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Partial<DeltaOp>;
	if ("retain" in candidate) {
		return typeof candidate.retain === "number";
	}
	if ("insert" in candidate) {
		return typeof candidate.insert === "string";
	}
	if ("delete" in candidate) {
		return typeof candidate.delete === "number";
	}
	return false;
}

function deltaToTextEdits(ops: Delta): TextEdit[] {
	const edits: TextEdit[] = [];
	let oldCursor = 0;
	let pendingStart: number | null = null;
	let pendingDelete = 0;
	let pendingInsert = "";

	const flush = (): void => {
		if (pendingStart === null) {
			return;
		}
		edits.push({
			offset: pendingStart,
			length: pendingDelete,
			text: pendingInsert,
		});
		pendingStart = null;
		pendingDelete = 0;
		pendingInsert = "";
	};

	for (const op of ops) {
		if ("retain" in op) {
			flush();
			oldCursor += op.retain;
			continue;
		}

		if (pendingStart === null) {
			pendingStart = oldCursor;
		}

		if ("delete" in op) {
			pendingDelete += op.delete;
			oldCursor += op.delete;
			continue;
		}

		pendingInsert += op.insert;
	}

	flush();
	return edits;
}

function toTextEdits(input: TextEdit | TextEdit[] | Delta): TextEdit[] {
	if (isTextEdit(input)) {
		return [input];
	}

	if (!Array.isArray(input)) {
		throw new Error("Invalid patch input");
	}

	if (input.length === 0) {
		return [];
	}

	if (input.every(isTextEdit)) {
		return input;
	}

	if (input.every(isDeltaOp)) {
		return deltaToTextEdits(input);
	}

	throw new Error("Invalid patch input");
}

function applyTextEdit(source: string, edit: TextEdit): string {
	const before = source.slice(0, edit.offset);
	const after = source.slice(edit.offset + edit.length);
	return `${before}${edit.text}${after}`;
}

function countNewlines(text: string): number {
	let count = 0;
	for (const ch of text) {
		if (ch === "\n") {
			count += 1;
		}
	}
	return count;
}

function lastLineLength(text: string): number {
	const idx = text.lastIndexOf("\n");
	if (idx === -1) {
		return text.length;
	}
	return text.length - idx - 1;
}

function createOffsetPatch(edit: TextEdit, previousSource: string): AstPatch {
	const removed = previousSource.slice(edit.offset, edit.offset + edit.length);
	const delta = edit.text.length - edit.length;
	const lineDelta = countNewlines(edit.text) - countNewlines(removed);
	const columnDelta =
		lineDelta === 0
			? edit.text.length - removed.length
			: lastLineLength(edit.text) - lastLineLength(removed);

	return {
		type: "UPDATE_OFFSETS",
		startOffset: edit.offset + edit.length,
		delta,
		lineDelta,
		columnDelta,
	};
}

function lineStart(text: string, offset: number): number {
	let index = Math.max(0, Math.min(offset, text.length));
	while (index > 0 && text[index - 1] !== "\n") {
		index -= 1;
	}
	return index;
}

function lineEnd(text: string, offset: number): number {
	let index = Math.max(0, Math.min(offset, text.length));
	while (index < text.length && text[index] !== "\n") {
		index += 1;
	}
	if (index < text.length) {
		index += 1;
	}
	return index;
}

function nodeKindsMatch(a: Node, b: Node): boolean {
	if (a.type !== b.type) {
		return false;
	}
	if (a.type === "element" && b.type === "element") {
		return a.name === b.name;
	}
	if (
		(a.type === "text" || a.type === "comment") &&
		(b.type === "text" || b.type === "comment")
	) {
		return a.content === b.content;
	}
	return true;
}

function diffAttributes(
	path: number[],
	prev: Node,
	next: Node,
	patches: AstPatch[],
): void {
	const keys = new Set<string>([
		...prev.attributes.keys(),
		...next.attributes.keys(),
	]);

	for (const key of keys) {
		const prevValue = prev.attributes.get(key);
		const nextValue = next.attributes.get(key);
		if (prevValue !== nextValue) {
			patches.push({
				type: "UPDATE_ATTRIBUTE",
				path,
				key,
				value: nextValue ?? null,
			});
		}
	}
}

function diffNodes(
	path: number[],
	prev: Node,
	next: Node,
	patches: AstPatch[],
): void {
	if (!nodeKindsMatch(prev, next)) {
		patches.push({
			type: "REPLACE_NODE",
			path,
			oldNode: prev,
			newNodes: [next],
		});
		return;
	}

	diffAttributes(path, prev, next, patches);

	const commonLength = Math.min(prev.children.length, next.children.length);
	for (let i = 0; i < commonLength; i += 1) {
		diffNodes([...path, i], prev.children[i], next.children[i], patches);
	}

	if (prev.children.length > next.children.length) {
		for (let i = prev.children.length - 1; i >= next.children.length; i -= 1) {
			patches.push({
				type: "DELETE_NODE",
				path: [...path, i],
				node: prev.children[i],
			});
		}
	}

	if (next.children.length > prev.children.length) {
		for (let i = prev.children.length; i < next.children.length; i += 1) {
			patches.push({
				type: "INSERT_NODE",
				path: [...path, i],
				node: next.children[i],
			});
		}
	}
}

function cloneNode(node: Node): Node {
	return {
		id: node.id,
		type: node.type,
		name: node.name,
		content: node.content,
		attributes: new Map(node.attributes),
		children: node.children.map((child) => cloneNode(child)),
		position: node.position
			? {
					start: node.position.start,
					end: node.position.end,
					line: node.position.line,
					column: node.position.column,
					...(node.position.block !== undefined
						? { block: node.position.block }
						: {}),
				}
			: undefined,
	};
}

function parseRange(
	parser: TextoParser,
	source: string,
	start: number,
	end: number,
): Node[] {
	const documentPosition = {
		start: 0,
		end: source.length,
		line: 1,
		column: 0,
	};
	const builder = new DocumentBuilder(documentPosition);
	const context = new ParsingContext(builder, source);
	context.setText(source);
	context.setParser(parser);
	context.setCurrentBlock(start, end);

	(
		parser as unknown as {
			parseBlocksInRange: (
				ctx: ParsingContext,
				parentNode: Node,
				startOffset: number,
				endOffset: number,
			) => void;
		}
	).parseBlocksInRange(context, builder.getDocument().content, start, end);

	builder.normalizeEmptyNodes();
	return builder.getDocument().content.children.map((node) => cloneNode(node));
}

interface LocalRegion {
	startIndex: number;
	oldCount: number;
	oldStart: number;
	oldEnd: number;
	newStart: number;
	newEnd: number;
}

function intersects(node: Node, start: number, end: number): boolean {
	if (!node.position) {
		return false;
	}
	if (start === end) {
		return node.position.start <= start && node.position.end >= start;
	}
	return node.position.end > start && node.position.start < end;
}

function findInsertIndex(children: Node[], offset: number): number {
	for (let i = 0; i < children.length; i += 1) {
		const position = children[i].position;
		if (position && position.start >= offset) {
			return i;
		}
	}
	return children.length;
}

function resolveLocalRegion(
	content: Node,
	previousSource: string,
	edit: TextEdit,
): LocalRegion {
	const children = content.children;
	const editStart = edit.offset;
	const editEnd = edit.offset + edit.length;
	const delta = edit.text.length - edit.length;

	let first = -1;
	let last = -1;

	for (let i = 0; i < children.length; i += 1) {
		if (intersects(children[i], editStart, editEnd)) {
			if (first === -1) {
				first = i;
			}
			last = i;
		}
	}

	if (children.length === 0) {
		const start = lineStart(previousSource, editStart);
		const end = lineEnd(previousSource, editEnd);
		return {
			startIndex: 0,
			oldCount: 0,
			oldStart: start,
			oldEnd: end,
			newStart: start,
			newEnd: Math.max(start, end + delta),
		};
	}

	if (first === -1) {
		const insertIndex = findInsertIndex(children, editStart);
		const leftIndex = insertIndex > 0 ? insertIndex - 1 : -1;
		const rightIndex = insertIndex < children.length ? insertIndex : -1;

		if (leftIndex === -1 && rightIndex === -1) {
			return {
				startIndex: 0,
				oldCount: 0,
				oldStart: lineStart(previousSource, editStart),
				oldEnd: lineEnd(previousSource, editEnd),
				newStart: lineStart(previousSource, editStart),
				newEnd: lineEnd(previousSource, editEnd) + delta,
			};
		}

		const startIndex = leftIndex !== -1 ? leftIndex : rightIndex;
		const endIndex = rightIndex !== -1 ? rightIndex : leftIndex;
		const startNode = children[startIndex];
		const endNode = children[endIndex];
		const oldStart =
			startNode.position?.start ?? lineStart(previousSource, editStart);
		const oldEnd = endNode.position?.end ?? lineEnd(previousSource, editEnd);

		return {
			startIndex,
			oldCount: endIndex - startIndex + 1,
			oldStart,
			oldEnd,
			newStart: oldStart,
			newEnd: Math.max(oldStart, oldEnd + delta),
		};
	}

	const startNode = children[first];
	const endNode = children[last];
	const oldStart =
		startNode.position?.start ?? lineStart(previousSource, editStart);
	const oldEnd = endNode.position?.end ?? lineEnd(previousSource, editEnd);

	return {
		startIndex: first,
		oldCount: last - first + 1,
		oldStart,
		oldEnd,
		newStart: oldStart,
		newEnd: Math.max(oldStart, oldEnd + delta),
	};
}

function buildLocalStructuralPatches(
	content: Node,
	region: LocalRegion,
	parsedNodes: Node[],
): AstPatch[] {
	const patches: AstPatch[] = [];
	const oldNodes = content.children.slice(
		region.startIndex,
		region.startIndex + region.oldCount,
	);

	if (oldNodes.length === parsedNodes.length && oldNodes.length > 0) {
		for (let i = 0; i < oldNodes.length; i += 1) {
			diffNodes(
				[1, region.startIndex + i],
				oldNodes[i],
				parsedNodes[i],
				patches,
			);
		}
		return patches;
	}

	for (let i = oldNodes.length - 1; i >= 0; i -= 1) {
		patches.push({
			type: "DELETE_NODE",
			path: [1, region.startIndex + i],
			node: oldNodes[i],
		});
	}

	for (let i = 0; i < parsedNodes.length; i += 1) {
		patches.push({
			type: "INSERT_NODE",
			path: [1, region.startIndex + i],
			node: parsedNodes[i],
		});
	}

	return patches;
}

function getSectionByIndex(tree: Document, index: number): Node {
	const key = SECTION_ORDER[index];
	if (!key) {
		throw new Error(`Invalid section index: ${index}`);
	}
	return tree[key];
}

function resolveNode(tree: Document, path: number[]): Node | null {
	if (path.length === 0) {
		return null;
	}

	let current = getSectionByIndex(tree, path[0]);
	for (let i = 1; i < path.length; i += 1) {
		const index = path[i];
		if (index < 0 || index >= current.children.length) {
			return null;
		}
		current = current.children[index];
	}

	return current;
}

function resolveParentAndIndex(
	tree: Document,
	path: number[],
): { parent: Node; index: number } | null {
	if (path.length < 2) {
		return null;
	}

	let current = getSectionByIndex(tree, path[0]);
	for (let i = 1; i < path.length - 1; i += 1) {
		const index = path[i];
		if (index < 0 || index >= current.children.length) {
			return null;
		}
		current = current.children[index];
	}

	return { parent: current, index: path[path.length - 1] };
}

function walkNode(node: Node, visit: (node: Node) => void): void {
	visit(node);
	for (const child of node.children) {
		walkNode(child, visit);
	}
}

export function applyAstPatches(tree: Document, patches: AstPatch[]): void {
	for (const patch of patches) {
		switch (patch.type) {
			case "UPDATE_OFFSETS": {
				const seenPositions = new WeakSet<object>();
				for (let i = 0; i < SECTION_ORDER.length; i += 1) {
					walkNode(getSectionByIndex(tree, i), (node) => {
						if (!node.position) {
							return;
						}
						if (seenPositions.has(node.position as object)) {
							return;
						}
						seenPositions.add(node.position as object);

						if (node.position.start >= patch.startOffset) {
							node.position.start += patch.delta;
							node.position.end += patch.delta;
							node.position.line = Math.max(
								1,
								node.position.line + patch.lineDelta,
							);
							if (patch.lineDelta !== 0 || node.position.column > 0) {
								node.position.column = Math.max(
									0,
									node.position.column + patch.columnDelta,
								);
							}
						} else if (node.position.end >= patch.startOffset) {
							node.position.end += patch.delta;
						}
					});
				}
				break;
			}
			case "UPDATE_ATTRIBUTE": {
				const node = resolveNode(tree, patch.path);
				if (!node) {
					break;
				}
				if (patch.value === null) {
					node.attributes.delete(patch.key);
				} else {
					node.attributes.set(patch.key, patch.value);
				}
				break;
			}
			case "REPLACE_NODE": {
				const location = resolveParentAndIndex(tree, patch.path);
				if (!location) {
					break;
				}
				const previous = location.parent.children[location.index];
				const nextNodes = patch.newNodes.map((node) => cloneNode(node));
				if (previous && nextNodes.length === 1) {
					nextNodes[0].id = previous.id;
				}
				location.parent.children.splice(location.index, 1, ...nextNodes);
				break;
			}
			case "DELETE_NODE": {
				const location = resolveParentAndIndex(tree, patch.path);
				if (!location) {
					break;
				}
				location.parent.children.splice(location.index, 1);
				break;
			}
			case "INSERT_NODE": {
				const location = resolveParentAndIndex(tree, patch.path);
				if (!location) {
					break;
				}
				location.parent.children.splice(
					location.index,
					0,
					cloneNode(patch.node),
				);
				break;
			}
			case "MOVE_NODE": {
				const from = resolveParentAndIndex(tree, patch.fromPath);
				const to = resolveParentAndIndex(tree, patch.toPath);
				if (!from || !to || from === to) {
					break;
				}
				const [node] = from.parent.children.splice(from.index, 1);
				if (!node) {
					break;
				}
				to.parent.children.splice(to.index, 0, node);
				break;
			}
		}
	}
}

export class IncrementalParser {
	readonly parser: TextoParser;
	source: string;
	tree: Document;

	constructor(source = "", parser?: TextoParser) {
		this.parser = parser ?? new TextoParser();
		this.source = "";
		this.tree = this.parser.parse("");
		this.init(source);
	}

	init(source: string): void {
		this.source = source;
		this.tree = this.parser.parse(source);
	}

	private patchEdit(edit: TextEdit): AstPatch[] {
		if (
			edit.offset < 0 ||
			edit.length < 0 ||
			edit.offset > this.source.length
		) {
			throw new Error("Invalid edit range");
		}
		if (edit.offset + edit.length > this.source.length) {
			throw new Error("Edit range exceeds source length");
		}

		const previousSource = this.source;
		const nextSource = applyTextEdit(previousSource, edit);
		const content = this.tree.content;
		const region = resolveLocalRegion(content, previousSource, edit);
		const localStart = lineStart(nextSource, region.newStart);
		const localEnd = lineEnd(nextSource, region.newEnd);
		const reparsedNodes = parseRange(
			this.parser,
			nextSource,
			localStart,
			localEnd,
		);
		const offsetPatch = createOffsetPatch(edit, previousSource);

		const patches: AstPatch[] = [offsetPatch];
		patches.push(
			...buildLocalStructuralPatches(
				content,
				{
					...region,
					newStart: localStart,
					newEnd: localEnd,
				},
				reparsedNodes,
			),
		);

		this.source = nextSource;
		applyAstPatches(this.tree, patches);
		annotateBlockStructure(this.tree);

		return patches;
	}

	patch(edit: TextEdit): AstPatch[];
	patch(edits: TextEdit[]): AstPatch[];
	patch(delta: Delta): AstPatch[];
	patch(input: TextEdit | TextEdit[] | Delta): AstPatch[] {
		const edits = toTextEdits(input);
		if (edits.length === 0) {
			return [];
		}

		const patches: AstPatch[] = [];
		let shift = 0;

		for (const edit of edits) {
			const liveEdit: TextEdit = {
				offset: edit.offset + shift,
				length: edit.length,
				text: edit.text,
			};
			patches.push(...this.patchEdit(liveEdit));
			shift += edit.text.length - edit.length;
		}

		return patches;
	}
}

export function init(source: string, parser?: TextoParser): IncrementalParser {
	return new IncrementalParser(source, parser);
}
