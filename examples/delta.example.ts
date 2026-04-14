import diff from "fast-diff";
import { apply, delta, revert, setDiffEngine } from "@texto";

const oldtext = "A B C D";
const newtext = "A X C Y D";

// Optional: enable minimal diff patches with fast-diff.
setDiffEngine(diff);

const forward = delta(oldtext, newtext);
const applied = apply(oldtext, forward);
const backward = revert(oldtext, newtext, forward);
const restored = apply(applied.text, backward);

console.log("old:", oldtext);
console.log("new:", newtext);
console.log("forward patches:", JSON.stringify(forward));
console.log("applied:", applied.text, "range=", applied.range);
console.log("backward patches:", JSON.stringify(backward));
console.log("restored:", restored.text);

// To use default contiguous heuristic again:
// setDiffEngine(null);
