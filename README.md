```
 _           _           _
| |_ ___ _ _| |_ ___    |_|___
|  _| -_|_'_|  _| . |_  | |_ -|
|_| |___|_,_|_| |___|_|_| |___|
                      |___|
```

*Textp.js* is a structured document parsing and formatting library in
TypeScript. It parses markup text — both the texto native format and
standard Markdown — into a normalized AST document model, then renders
that AST into HTML, JSON, XML, or back to the original markup.

It is designed around a pluggable parser architecture with priority-based
block and inline parsers, multi-phase parsing (pre-parse, inline,
post-parse), and incremental parsing that re-processes only changed
regions on text edits. This makes it suitable for editors, previewers,
document pipelines, and any tool that needs to work with lightweight
markup programmatically.

You can learn more about each component:

- **Texto Syntax**: native lightweight markup format ― [reference](docs/ref-texto.md)
- **Texto Parser API**: programmatic parsing and rendering ― programmatic API
- **Texto CLI**: command-line tool for parsing and formatting documents ― CLI reference

## In a nutshell

```typescript
import { TextoParser, formatJSON, renderBackend, formatTexto } from "@texto/texto"

const markup = `
# Hello World

This is a **bold** paragraph with _emphasis_.

- First item
- Second item with **bold text**
`

const parser = new TextoParser()
const doc = parser.parse(markup)

console.log(formatJSON(doc, { includePositions: true }))
console.log(renderBackend(doc, "html"))
console.log(formatTexto(doc))
```

### CLI usage

```bash
texto doc.txto                              # Parse texto and output HTML
texto -f markdown doc.md                    # Force markdown input
texto -f html -t texto doc.html             # Convert HTML to texto
texto -f texto -t markdown doc.txto         # Convert texto to markdown
texto -t json -o out.json doc.txto          # Write JSON AST
echo '# Hi' | texto -f markdown -t html     # Convert stdin markdown to HTML
texto --body-only doc.txto                  # Emit only the inner HTML body content
```

### API

- `TextoParser`: core parser class with `parse(input)` method.
- `MarkdownParser`: extends `TextoParser` with reference-style link resolution.
- `createTextoParser()`: factory for a pre-configured texto parser.
- `createMarkdownParser(options)`: factory for a CommonMark-style parser.
- `DocumentBuilder`: stack-based document tree builder with header/content/references/appendices sections.
- `parseFrontend(input, format, options?)`: parse input via `"texto"`, `"markdown"`, or `"html"` frontends.
- `renderBackend(doc, format, options?)`: render AST to `"texto"`, `"markdown"`, `"html"`, `"json"`, or `"xml"`.
- HTML rendering accepts `{ bodyOnly: true }` to emit only the inner body content.
- `formatJSON(doc, options?)`: serialize AST to pretty-printed JSON.
- `formatTexto(doc)`: round-trip AST back to texto markup.
- `formatMarkdown(doc)`: render AST to CommonMark-style Markdown.
- `FrontEndProcessor`: walks an HTML tree and converts it to a Texto AST.
- `DefaultNodeFactory`: semantic factory for Texto AST nodes used by the frontend.
- `htmlToDocument(html)`: parse an HTML string into a Texto AST document.
- `htmlToTexto(html)`: convert an HTML string to native Texto markup.
- `delta(a, b)`: compute text delta operations between two strings.
- `IncrementalParser`: wraps a parser to re-process only changed regions.
- `ParserRegistry`: generic priority-sorted registry for parsers.
- `PhaseRegistry`: manages pre-parse, inline, and post-parse phases.
- Block parsers: `SectionParser`, `HeaderParser`, `ParagraphParser`, `FencedBlockParser`, `IndentedCodeParser`, `BlockquoteParser`, `ListParser`, `DefinitionListParser`, `HorizontalRuleParser`, `TaggedBlockParser`.
- Inline parsers: `EmphasisParser`, `CodeParser`, `LinkParser`, `ImageParser`, `EscapeParser`, `TextParser`.
- Document helpers: `createElement`, `createText`, `appendChild`, `findDescendants`, `getElementsByName`.
- `Cursor`: character-level cursor over text buffer with line/column tracking.

### Modules

- [`src/ts/texto/parsers/`](src/ts/texto/parsers/): block and inline parser implementations.
- [`src/ts/texto/parsing/`](src/ts/texto/parsing/): parsing engines, context, registry, phases, incremental support.
- [`src/ts/texto/profiles/`](src/ts/texto/profiles/): pre-configured parser profiles (texto, markdown).
- [`src/ts/texto/document/`](src/ts/texto/document/): AST node creation, tree traversal, document builder.
- [`src/ts/texto/backends/`](src/ts/texto/backends/): output renderers (texto, markdown, HTML, JSON, XML).
- [`src/ts/texto/frontends/`](src/ts/texto/frontends/): input frontends (texto, markdown, HTML).
- [`src/ts/texto/cli/`](src/ts/texto/cli/): command-line interface.
- [`src/ts/texto/delta.ts`](src/ts/texto/delta.ts): text diff and delta operations.
- [`docs/ref-texto.md`](docs/ref-texto.md): complete texto markup language reference.

### Notable examples

- [`examples/helloworld.ts`](examples/helloworld.ts): parse texto markup and traverse the AST with source positions.
- [`examples/delta.example.ts`](examples/delta.example.ts): text delta computation and application.
- [`examples/parsing-incremental.example.ts`](examples/parsing-incremental.example.ts): incremental re-parsing on text edits.

# Features

- *Dual-format parsing*: native texto markup and CommonMark Markdown.
- *Pluggable architecture*: priority-based block and inline parsers registered by name.
- *Multi-phase pipeline*: pre-parse, inline, and post-parse phases for extensible processing.
- *Incremental parsing*: re-parse only changed regions on text edits, producing AST patches.
- *Text delta engine*: compute, apply, and revert text operations between strings.
- *Multiple output formats*: HTML, JSON, XML, and round-trip back to markup.
- *Full source position tracking*: every AST node carries start/end offset and line/column.
- *No runtime dependencies*: pure TypeScript, works in Node.js and modern browsers.
