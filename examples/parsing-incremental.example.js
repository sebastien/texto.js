import {
  IncrementalParser,
  toJSON
} from "../src/js/texto/index.js";
const initialSource = `# Notes

Hello world.

- item one
- item two
`;
function describePatch(patch) {
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
function runEdit(parser, label, edit) {
  console.log(`
--- ${label} ---`);
  console.log("edit:", edit);
  const patches = parser.patch(edit);
  console.log("patches:");
  for (const patch of patches) {
    console.log(`  - ${describePatch(patch)}`);
  }
  console.log("source:");
  console.log(parser.source);
}
const parser = new IncrementalParser;
parser.init(initialSource);
console.log("=== Incremental Parsing Example ===");
console.log("initial source:");
console.log(parser.source);
runEdit(parser, "Insert punctuation", {
  offset: parser.source.indexOf("world") + "world".length,
  length: 0,
  text: "!"
});
runEdit(parser, "Replace list item", {
  offset: parser.source.indexOf("item two"),
  length: "item two".length,
  text: "item two (edited)"
});
runEdit(parser, "Delete heading marker", {
  offset: 0,
  length: 2,
  text: ""
});
console.log(`
final tree (json with positions):`);
console.log(toJSON(parser.tree, true));
