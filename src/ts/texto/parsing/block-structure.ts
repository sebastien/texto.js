import type { Document, Node } from "../utils/types.ts";

function isContainerNode(node: Node): boolean {
	if (node.type !== "element") {
		return false;
	}

	return (
		node.name === "document" ||
		node.name === "content" ||
		node.name === "section"
	);
}

function visitNode(
	node: Node,
	containerDepth: number,
	parentIsContainer: boolean,
): void {
	node.attributes.delete("block");
	node.attributes.delete("level");

	const isContainer = isContainerNode(node);

	if (isContainer) {
		node.attributes.set("block", "container");
		node.attributes.set("level", String(containerDepth));
	} else if (parentIsContainer && node.type === "element") {
		node.attributes.set("block", "block");
		node.attributes.set("level", String(containerDepth));
	}

	const nextContainerDepth = isContainer ? containerDepth + 1 : containerDepth;
	for (const child of node.children) {
		visitNode(child, nextContainerDepth, isContainer);
	}
}

export function annotateBlockStructure(doc: Document): void {
	for (const rootNode of [
		doc.header,
		doc.content,
		doc.references,
		doc.appendices,
	]) {
		visitNode(rootNode, 0, false);
	}
}
