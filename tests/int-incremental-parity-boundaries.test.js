import { describe, expect, test } from "bun:test";
import {
  IncrementalParser,
  TextoParser,
  delta,
  toJSON
} from "../src/js/texto/index.js";
const BASE = `
# Hello World

This is a *texto* document

- It supports **markdown-like** syntax
- It can be edited in-place

## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`;
const CASES = [
  {
    name: "insert blank line between list and next section",
    next: `
# Hello World

This is a *texto* document

- It supports **markdown-like** syntax
- It can be edited in-place


## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`
  },
  {
    name: "add list item after second item",
    next: `
# Hello World

This is a *texto* document

- It supports **markdown-like** syntax
- It can be edited in-place
- XXX

## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`
  },
  {
    name: "remove blank line before subsection heading",
    next: `
# Hello World

This is a *texto* document

- It supports **markdown-like** syntax
- It can be edited in-place
## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`
  },
  {
    name: "insert prefix at start of paragraph",
    next: BASE.replace("This is a *texto* document", "NOTE: This is a *texto* document")
  },
  {
    name: "append trailing paragraph at eof",
    next: `${BASE}

Final note.
`
  },
  {
    name: "remove first list item",
    next: `
# Hello World

This is a *texto* document

- It can be edited in-place

## Features

- Fast parsing
- Simple syntax
- Easy to use

Feel free to try it out and see how it works!
`
  },
  {
    name: "replace emphasis with strong in paragraph",
    next: BASE.replace("*texto*", "**texto**")
  }
];
describe("incremental parity boundaries", () => {
  test("single-step edits match full parse across boundary-heavy transitions", () => {
    const parser = new TextoParser;
    for (const entry of CASES) {
      const incremental = new IncrementalParser(BASE, parser);
      const edits = delta(BASE, entry.next);
      incremental.patch(edits);
      const full = parser.parse(entry.next);
      expect(incremental.source, entry.name).toBe(entry.next);
      expect(toJSON(incremental.tree, true), entry.name).toBe(toJSON(full, true));
    }
  });
  test("sequential user-like edits stay in sync with full parse", () => {
    const parser = new TextoParser;
    const incremental = new IncrementalParser(BASE, parser);
    let current = BASE;
    const sequence = [
      BASE.replace(`- It can be edited in-place
`, `- It can be edited in-place

`),
      BASE.replace(`- It can be edited in-place
`, `- It can be edited in-place

`).replace(`
## Features`, `
- XXX

## Features`),
      BASE.replace(`- It can be edited in-place
`, `- It can be edited in-place

`).replace(`
## Features`, `
- XXX

## Features`).replace("This is a *texto* document", "NOTE: This is a *texto* document")
    ];
    for (const next of sequence) {
      incremental.patch(delta(current, next));
      const full = parser.parse(next);
      expect(toJSON(incremental.tree, true)).toBe(toJSON(full, true));
      current = next;
    }
  });
  test("heading-only edits match full parse parity", () => {
    const parser = new TextoParser;
    const next = BASE.replace("# Hello World", "# Hello World XXX");
    const incremental = new IncrementalParser(BASE, parser);
    incremental.patch(delta(BASE, next));
    expect(toJSON(incremental.tree, true)).toBe(toJSON(parser.parse(next), true));
  });
});
