// Document tree builder with section tracking

import type { Document, Node, Position } from "../utils/types.ts";
import { appendChild, createElement, createText } from "./node.ts";

export interface SectionEntry {
	node: Node;
	content: Node;
	depth: number;
	indent: number;
}

export class DocumentBuilder {
	private document: Document;
	private stack: Node[];
	private sections: SectionEntry[];
	private current: Node;

	constructor(documentPosition?: Position) {
		const header = createElement("header", {}, documentPosition);
		const content = createElement("content", {}, documentPosition);
		const references = createElement("references", {}, documentPosition);
		const appendices = createElement("appendices", {}, documentPosition);

		const root = createElement("document", {}, documentPosition);
		appendChild(root, header);
		appendChild(root, content);
		appendChild(root, references);
		appendChild(root, appendices);

		this.document = {
			type: "document",
			header,
			content,
			references,
			appendices,
		};

		// Stack includes document root and content node
		// This ensures push/pop during parsing returns to content, not document
		this.stack = [root, content];
		this.sections = [];
		this.current = content;
	}

	getDocument(): Document {
		return this.document;
	}

	getRoot(): Node {
		return this.stack[0];
	}

	getCurrentNode(): Node {
		return this.current;
	}

	setCurrentNode(node: Node): void {
		this.current = node;
	}

	pushNode(node: Node): void {
		this.stack.push(node);
		this.current = node;
	}

	popNode(): Node | null {
		if (this.stack.length <= 1) return null;
		this.stack.pop();
		this.current = this.stack[this.stack.length - 1];
		return this.current;
	}

	appendToCurrent(child: Node): void {
		appendChild(this.current, child);
	}

	createAndAppend(
		name: string,
		attributes: Record<string, string> = {},
		position?: Position,
	): Node {
		const node = createElement(name, attributes, position);
		this.appendToCurrent(node);
		return node;
	}

	addText(content: string, position?: Position): Node {
		const node = createText(content, position);
		this.appendToCurrent(node);
		return node;
	}

	moveUp(): void {
		this.popNode();
	}

	moveToParentWithName(names: string[]): void {
		while (this.stack.length > 1) {
			const parent = this.stack[this.stack.length - 1];
			if (
				parent.type === "element" &&
				parent.name &&
				names.includes(parent.name)
			) {
				this.current = parent;
				return;
			}
			this.popNode();
		}
	}

	findParent(predicate: (node: Node) => boolean): Node | null {
		for (let i = this.stack.length - 1; i >= 0; i--) {
			if (predicate(this.stack[i])) {
				return this.stack[i];
			}
		}
		return null;
	}

	pushSection(node: Node, content: Node, depth: number, indent: number): void {
		this.sections.push({ node, content, depth, indent });
	}

	findParentSection(depth: number, indent: number): Node {
		for (let i = this.sections.length - 1; i >= 0; i--) {
			const section = this.sections[i];
			if (
				indent > section.indent ||
				(indent <= section.indent && section.depth < depth)
			) {
				return section.content;
			}
		}
		return this.document.content;
	}

	getCurrentSection(): SectionEntry | null {
		if (this.sections.length === 0) return null;
		return this.sections[this.sections.length - 1];
	}

	getSectionDepth(node: Node): number {
		let depth = 0;
		let current: Node | undefined = node;

		while (current) {
			if (current.type === "element" && current.name === "section") {
				depth++;
			}
			// Navigate up via stack
			const idx = this.stack.indexOf(current);
			if (idx > 0) {
				current = this.stack[idx - 1];
			} else {
				break;
			}
		}

		return depth;
	}

	ensureElement(
		parent: Node,
		name: string,
		index: number = 0,
		position?: Position,
	): Node {
		const elements = parent.children.filter(
			(child) => child.type === "element" && child.name === name,
		);

		if (elements.length > index) {
			// Update position if provided and element doesn't have one
			const element = elements[index];
			if (position && !element.position) {
				element.position = position;
			}
			return element;
		}

		const newElement = createElement(name, {}, position);
		appendChild(parent, newElement);
		return newElement;
	}

	normalizeEmptyNodes(): void {
		// Remove empty header, references, appendices
		for (const node of [
			this.document.header,
			this.document.references,
			this.document.appendices,
		]) {
			if (node.children.length === 0) {
				const root = this.getRoot();
				const idx = root.children.indexOf(node);
				if (idx !== -1) {
					root.children.splice(idx, 1);
				}
			}
		}
	}
}
