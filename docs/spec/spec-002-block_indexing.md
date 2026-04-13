# Specification: Block Indexing in Texto.js

## 1. Goal

Introduce a stable, sequential block index on node positions so block-level AST nodes can be addressed directly by their source-order block number.

This enables precise, surgical edits scoped to the original flat text structure (paragraph/list/header/etc. blocks separated by blank lines) without relying only on character offsets.

## 2. Scope

This specification defines:

- A new optional `block` field on `Position`.
- A structural `block` node attribute used to classify top-level block boundaries in the tree.
- A structural `level` node attribute indicating container depth.
- How block numbers are assigned during block parsing.
- Which nodes do and do not receive a block number.
- How block numbers are exposed in output backends that emit positions.

Out of scope:

- Changing block boundary detection rules.
- Adding block numbers to inline-only or text leaf nodes.
- Introducing a new public API for block lookup (this spec only adds metadata).

## 3. Data Model Changes

`Position` is extended with an optional `block` field:

```typescript
export interface Position {
    start: number;
    end: number;
    line: number;
    column: number;
    block?: number;
}
```

Compatibility requirements:

- `block` is optional to preserve backward compatibility.
- Existing position consumers that read only `start/end/line/column` remain valid.

In addition, node attributes may contain structural metadata:

- `block="container"` for container nodes.
- `block="block"` for non-container nodes that are direct children of a container.
- No `block` attribute for all other nodes.
- `level="N"` for nodes with `block="container"` or `block="block"`.

These are regular node attributes (not part of `Position`) and are intended as a second way to identify top-level block structure.

## 4. Structural Block Attribute Semantics

### 4.1 Container Nodes

Container nodes receive:

- `block="container"`
- `level="N"`

Container examples:

- document content root containers (for example `document`, `content`)
- transparent section wrappers (for example `section` and section content wrappers)

### 4.2 Direct Block Children of Containers

A non-container node whose parent has `block="container"` receives:

- `block="block"`
- `level="N"` where `N = parent level + 1`

This marks nodes that are top-level blocks relative to their current container.

### 4.3 Nested Non-container Descendants

Nodes that are not containers and are not direct children of a container do not receive `block` or `level`.

### 4.4 Level Rules

- Level starts at `0` for the outermost container.
- Each container boundary increases depth by `+1`.
- A direct block child of a container uses the container depth + `1`.

## 5. Numbering Semantics

### 4.1 Base

Block numbering is **0-based**.

### 4.2 Sequence

Block numbers are assigned in source order as block-level parsers produce nodes.

### 4.3 Assignment Target

Only block-level AST nodes receive `position.block`.

- Example targets: paragraph, list, list item block node, section/header block node, blockquote, pre/fenced/tagged blocks (except ignored types below).
- Non-targets: inline elements and text/comment descendants.

### 4.4 Ignored Block Types

Blocks recognized as markup-like blocks are excluded from the sequence:

- `type: "markup"`
- `type: "html"`

Exclusion rule:

- Ignored blocks do **not** get `position.block`.
- Ignored blocks do **not** consume an index.

## 6. Parsing Behavior

During block parsing, after a block parser successfully returns a node:

1. If the block is ignored (`markup`/`html`), do nothing.
2. Otherwise, assign the next block index to `node.position.block`.
3. Increment the internal block counter.

Counter lifecycle:

- Counter resets to `0` at the start of each full parse.
- Counter state is preserved across context cloning used by incremental parsing internals.

Structural attribute assignment lifecycle:

- `block`/`level` are assigned during tree construction/finalization.
- They are derived from final parent/child structure, not inline parsing state.

## 7. Output Behavior

### 6.1 JSON

When `includePositions` is enabled, JSON output includes `position.block` when present.

Structural node attributes (`block` and `level`) are emitted as regular attributes when present.

Example:

```json
{
  "type": "element",
  "name": "p",
  "position": {
    "start": 0,
    "end": 11,
    "line": 1,
    "column": 0,
    "block": 0
  }
}
```

### 6.2 XML

When `includePositions` is enabled, XML output includes `block="N"` when present.

For structural metadata, node attributes include `block="container|block"` and `level="N"` where assigned.

Example:

```xml
<node type="element" name="p" start="0" end="11" line="1" column="0" block="0">
```

## 8. Incremental Parsing Considerations

When nodes are cloned or patched by incremental parsing utilities, `position.block` must be preserved if present.

This spec does not require recomputing global block numbering for unchanged regions during patch application; it requires that the field is not dropped by cloning/serialization logic.

## 9. Acceptance Criteria

1. Given two paragraphs (`"A\n\nB\n"`), emitted block indices are `[0, 1]` on the two block nodes.
2. JSON output with positions includes `block` for numbered blocks.
3. XML output with positions includes `block="..."` for numbered blocks.
4. Inline/text descendants do not receive a `block` field unless independently created as block nodes.
5. Markup/HTML blocks are excluded from numbering and do not shift the numbering of subsequent non-ignored blocks.
6. Container nodes receive `block="container"` and a `level`.
7. Non-container direct children of containers receive `block="block"` and `level = container level + 1`.
8. Other descendants do not receive structural `block`/`level` attributes.

## 10. Example

Input:

```text
First paragraph

Second paragraph
```

Expected block numbering:

- First paragraph node: `position.block = 0`
- Second paragraph node: `position.block = 1`

Expected structural attributes (illustrative):

- `document` container: `block="container"`, `level="0"`
- `content` container: `block="container"`, `level="1"`
- first paragraph under `content`: `block="block"`, `level="2"`
- second paragraph under `content`: `block="block"`, `level="2"`
