```
 _           _           _
| |_ ___ _ _| |_ ___    |_|___
|  _| -_|_'_|  _| . |_  | |_ -|
|_| |___|_,_|_| |___|_|_| |___|
                      |___|
```

*Textp.js* is a structured document parsing and formatting library in
vanilla JavaScript. It parses markup text — both the texto native format and
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

```javascript
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
- `FRONTENDS` / `BACKENDS`: the format registries backing `parseFrontend()` / `renderBackend()`. Register your own format on either to extend the pipeline.
- `setHtmlParser(engine)`: register a fallback HTML parser for non-browser environments (auto-registered by the server entry). `engine` receives an HTML string and returns a DOM-ish element — either a document element or a `<body>`. Pass `null` to clear it.
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

- [`src/js/texto/parsers/`](src/js/texto/parsers/): block and inline parser implementations.
- [`src/js/texto/parsing/`](src/js/texto/parsing/): parsing engines, context, registry, phases, incremental support.
- [`src/js/texto/profiles/`](src/js/texto/profiles/): pre-configured parser profiles (texto, markdown).
- [`src/js/texto/document/`](src/js/texto/document/): AST node creation, tree traversal, document builder.
- [`src/js/texto/backends/`](src/js/texto/backends/): output renderers (texto, markdown, HTML, JSON, XML).
- [`src/js/texto/frontends/`](src/js/texto/frontends/): input frontends (texto, markdown, HTML) plus the frontend registry in `index.js`.
- [`src/js/texto/server/`](src/js/texto/server/): the Node-only surface — `index.js` (public entry), `main.js` (CLI implementation and HTML-fallback registration), `domish.js` (the domish adapter), `bin.js` (executable entry used by [`bin/texto`](bin/texto)).
- [`src/js/texto/delta.js`](src/js/texto/delta.js): text diff and delta operations.
- [`docs/ref-texto.md`](docs/ref-texto.md): complete texto markup language reference.

### Entry points

The library has a strict browser/Node boundary, enforced by
`tests/unit-web-boundary.test.js` (which walks the import graph of the web
entry and fails on any `node:`/bare import, `.ts` file, or `process`/`Buffer`
usage):

- `@texto/texto` ([`src/js/texto/index.js`](src/js/texto/index.js)) — the
  **web/browser surface**: parser, all frontends (texto, markdown, html) and
  backends, delta engine, incremental parsing. Pure JavaScript, no runtime
  dependencies, loads directly in a browser via `<script type="module">` or a
  bundle built with `npm run build` (emits `dist/texto.min.js`, which is not
  checked in). HTML input uses the browser's `DOMParser`.
- `@texto/texto/server` ([`src/js/texto/server/index.js`](src/js/texto/server/index.js)) —
  the **Node surface**: everything in the web surface plus the CLI utilities
  (`args`, `help`), `main`/`renderCommand`, and a fallback HTML parser
  (domish) so HTML input works outside a browser. Importing it registers the
  fallback via `setHtmlParser()`.

The boundary is a **path convention**: `src/js/texto/server/` is the entire
Node-only subtree, and nothing under it may be reachable from the web entry.
Adding a Node-only module means putting it there — the boundary test picks it
up automatically, with no list to maintain. `src/js/texto/utils/` is shared
and stays dependency-free.

Outside a browser, parsing HTML requires the server entry (or registering your
own parser with `setHtmlParser()`); the web entry will throw a descriptive
error instead of silently missing the capability.

### Third-party dependencies

Vendored dependencies are *not* committed. They are listed in
[`.gitdeps`](.gitdeps) (`path`, `git URL`, `ref` per line) and cloned into
`deps/`, which is gitignored:

| Path                | Provides                                            |
| ------------------- | --------------------------------------------------- |
| `deps/domish.js`    | the non-browser HTML parser wired up by `server/domish.js` |
| `deps/md`           | the CommonMark test suite (`tests/int-markdown-testsuite.test.js`) |
| `deps/sdk`          | the LittleSDK Make tooling (`make check`, `make fmt`)       |

Run `make deps` to clone them all. There is also a `git-deps` tool in the
SDK that reads the same file, but this project does not enable the SDK's
`tools` module, so `make deps` is the supported path.

The web entry and its test (`tests/unit-web-boundary.test.js`) do not touch
`deps/`, so `@texto/texto` builds and loads in a browser without any of them.
Only the server entry and the Markdown conformance suite need `deps/` present.

### Notable examples

- [`examples/helloworld.js`](examples/helloworld.js): parse texto markup and traverse the AST with source positions.
- [`examples/delta.example.js`](examples/delta.example.js): text delta computation and application.
- [`examples/parsing-incremental.example.js`](examples/parsing-incremental.example.js): incremental re-parsing on text edits.

# Features

- *Dual-format parsing*: native texto markup and CommonMark Markdown.
- *Pluggable architecture*: priority-based block and inline parsers registered by name.
- *Multi-phase pipeline*: pre-parse, inline, and post-parse phases for extensible processing.
- *Incremental parsing*: re-parse only changed regions on text edits, producing AST patches.
- *Text delta engine*: compute, apply, and revert text operations between strings.
- *Multiple output formats*: HTML, JSON, XML, and round-trip back to markup.
- *Full source position tracking*: every AST node carries start/end offset and line/column.
- *No runtime dependencies*: pure JavaScript, works in Node.js and modern browsers.
