# Specification: Incremental Parsing in Texto.js

## 1. Goal

Introduce incremental parsing capabilities to `texto.js`. The goal is to avoid re-parsing an entire document when small localized edits occur. Instead, the parser will take a string edit (insert, replace, delete), apply it to the source, identify the minimal affected region in the Abstract Syntax Tree (AST), re-parse only that region, and produce a structural "Patch" describing the changes. 

This patch can then be applied to the existing AST to update it in-place, efficiently adjusting both the tree structure and the positional tracking (offsets, lines, columns) of all subsequent nodes.

## 2. Data Structures

To formally describe text modifications and AST delta patches, new types will be introduced (e.g., in `src/ts/texto/parsing/incremental.ts`).

### 2.1 Text Edit

Represents a change in the source text from the editor/user.

```typescript
export interface TextEdit {
    offset: number;     // Start index of the edit in the original string
    length: number;     // Number of characters to replace/delete (0 for insertion)
    text: string;       // The new string to insert at the offset
}
```

### 2.2 AST Patch (Delta)

Defines the structural and positional updates required to synchronize the old AST with the new text.

```typescript
export type AstPatch =
    | { 
        type: "UPDATE_OFFSETS"; 
        startOffset: number; 
        delta: number; 
        lineDelta: number; 
        columnDelta: number; 
      }
    | { 
        type: "REPLACE_NODE"; 
        path: number[]; // Sequence of child indices from the root
        oldNode: Node; 
        newNodes: Node[]; 
      }
    | { 
        type: "DELETE_NODE"; 
        path: number[]; 
        node: Node; 
      }
    | { 
        type: "INSERT_NODE"; 
        path: number[]; 
        node: Node; 
      }
    | {
        type: "UPDATE_ATTRIBUTE";
        path: number[];
        key: string;
        value: string | null; // string to set/update, null to remove
      };
```
*Note: `path` represents the sequence of child indices from the root to uniquely locate the target node.*

## 3. The `IncrementalParser` Class

This class will manage the parser's state (the current source string and the parsed AST) and coordinate the patching process.

### 3.1 State
*   `source`: The current full string of the document.
*   `tree`: The root `Document` node of the current AST.

### 3.2 Workflow

The class will expose two main methods for its core API:

*   **`init(source: string): void`**: Parses the entire initial string and establishes the baseline `.source` and `.tree`.
*   **`patch(edit: TextEdit): AstPatch[]`**: Takes an incoming text edit, updates the internal `.source` string, applies local re-parsing, mutates the internal `.tree`, and returns the array of generated patches describing the structural and positional updates.

When `patch(edit)` is called, the parser will internally execute the following steps:

1.  **Locate Affected Region**: Traverse the AST using the edit's `offset` and `length` to find the smallest block-level node(s) that fully encapsulate the edit. If the edit bridges multiple blocks (e.g., deleting a blank line between two paragraphs), it expands the "affected region" to encompass all involved blocks, potentially falling back to their common parent.
2.  **Update Source Text**: Apply the `TextEdit` to the internal `source` string.
3.  **Local Re-parsing**: Extract the updated substring corresponding to the affected region's original boundaries (adjusted for the edit length) and pass it through the block parser.
4.  **Generate Structural Patches**: Compare the old affected nodes with the newly parsed nodes. If they differ in type, content, or boundaries beyond simple shifts, emit `REPLACE_NODE`, `INSERT_NODE`, or `DELETE_NODE` patches.
5.  **Generate Positional Patches**: Calculate the net change in string length and line/column counts caused by the text edit. Emit an `UPDATE_OFFSETS` patch instructing all nodes positioned *after* the affected region to shift their `Position` attributes by the calculated deltas.

## 4. AST Patcher Utility (Internal)

An internal utility function will be used by the `patch()` method to apply the generated patches and mutate the AST (`.tree`) in-place.

```typescript
function applyAstPatches(root: Node, patches: AstPatch[]): void;
```

*   **`UPDATE_OFFSETS`**: Walk the AST and adjust `start`, `end`, `line`, and `column` for every node where `node.position.start >= startOffset`.
*   **`REPLACE_NODE` / `DELETE_NODE` / `INSERT_NODE`**: Navigate to the parent node using the `path` array and modify its `children` array to execute the structural change.
*   **`UPDATE_ATTRIBUTE`**: Navigate to the target node using the `path` array. If `value` is a string, add/update the attribute; if `value` is `null`, remove the attribute from the node's `attributes` map.

## 5. Edge Cases & Handling

*   **Cross-Block Edits**: If an edit invalidates a block boundary (e.g., changing a list item marker so it becomes a regular paragraph, or deleting a fence closing backtick), the incremental parser will need to fall back to re-parsing the parent node, traversing up the tree (up to the root Document if necessary) until a stable boundary is found.
*   **Performance Optimization**: The `UPDATE_OFFSETS` traversal will be optimized to stop traversing branches that are entirely before the `startOffset`. Path-based lookups for structural changes will execute in $O(D)$ time where $D$ is the depth of the tree.
