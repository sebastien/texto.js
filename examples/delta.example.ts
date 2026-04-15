import diff from "fast-diff";
import {
	apply,
	delta,
	IncrementalParser,
	revert,
	setDiffEngine,
	type AstPatch,
} from "@texto";

function describePatch(patch: AstPatch): string {
	switch (patch.type) {
		case "UPDATE_OFFSETS":
			return `UPDATE_OFFSETS start=${patch.startOffset} delta=${patch.delta}`;
		case "UPDATE_ATTRIBUTE":
			return `UPDATE_ATTRIBUTE path=[${patch.path.join(",")}] ${patch.key}=${patch.value}`;
		case "REPLACE_NODE":
			return `REPLACE_NODE path=[${patch.path.join(",")}] count=${patch.newNodes.length}`;
		case "DELETE_NODE":
			return `DELETE_NODE path=[${patch.path.join(",")}]`;
		case "INSERT_NODE":
			return `INSERT_NODE path=[${patch.path.join(",")}]`;
		case "MOVE_NODE":
			return `MOVE_NODE from=[${patch.fromPath.join(",")}] to=[${patch.toPath.join(",")}]`;
	}
}

const oldtext = "A B C D";
const newtext = "A X C Y D";

// Optional: enable minimal diff patches with fast-diff.
setDiffEngine(diff);

const forward = delta(oldtext, newtext);
const applied = apply(oldtext, forward);
const backward = revert(oldtext, newtext, forward);
const restored = apply(applied.text, backward);

const incremental = new IncrementalParser(oldtext);
const incrementalPatches = incremental.patch(forward);

console.log("incremental AST patches:");
for (const patch of incrementalPatches) {
	console.log(`  - ${describePatch(patch)}`);
}

console.log("old:", oldtext);
console.log("new:", newtext);
console.log("forward patches:", JSON.stringify(forward));
console.log("applied:", applied.text, "range=", applied.range);
console.log("backward patches:", JSON.stringify(backward));
console.log("restored:", restored.text);
console.log("incremental source:", incremental.source);
console.log("incremental matches new:", incremental.source === newtext);

// To use default contiguous heuristic again:
// setDiffEngine(null);
