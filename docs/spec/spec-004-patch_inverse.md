# Patching

We'd like to support creating Quill Delta patches <https://github.com/slab/delta> from text updates, so that:
- Patches can be recorded and applied to a CRDT structure (separately)
- Patches can be saved as JSON for history
- Inverse patches can be computed fro undo

We'd like to add a texto/delta module that does this:
- `delta(oldtext, newtext, start?,end?)` computes one or more patches that define
   the changes from `oldtext` to `newtext` within the `start->end` range.
- `revert(oldtext, newtext, patches?)` computes the inverse patches that can convert newtext
   to oldtext, optionally taking the list of patches from oldtext to newtext.
- `apply(text,patches)` to apply the patches to the text and return an updated text and the min/max range changed.

## Implementation Details

**Location:** `src/js/texto/delta.js`

### Types
We will use a lightweight variant of Quill Delta that omits rich-text attributes, focusing purely on plain text mutations:

```typescript
export interface RetainOp { retain: number; }
export interface InsertOp { insert: string; }
export interface DeleteOp { delete: number; }
export type DeltaOp = RetainOp | InsertOp | DeleteOp;
export type Delta = DeltaOp[];

export interface ApplyResult {
    text: string;
    range: [number, number]; // [min_affected_index, max_affected_index]
}
```

### Algorithm & Behavior
- **`delta`**: Implemented using an efficient Common Prefix / Suffix Diffing heuristic. It identifies the shared start and end of the strings to isolate the changed middle section. If `start` and `end` are provided (e.g., from an input event), it bypasses the search for O(1) diffing. If the `fast-diff` library is provided via dependency injection (`setDiffEngine`), it will utilize it to compute a mathematically minimal set of patches (Myers diff algorithm), cleanly separating scattered insertions and deletions.
- **`apply`**: Iterates over the operations to splice strings, tracking the `min` and `max` indices affected by inserts or deletes to return the mutation range.
- **`revert`**: When provided with a forward patch array, it efficiently maps operations to their inverse: `insert` becomes `delete` (by length), `delete` becomes `insert` (extracting the deleted characters from `oldtext`), and `retain` remains unchanged. If `patches` are omitted, it returns `delta(newtext, oldtext)`.
