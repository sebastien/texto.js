# Texto Parser - Directory Structure

```
src/ts/texto/
├── document/              # Document tree, nodes, builder
│   ├── node.ts
│   ├── tree.ts
│   └── builder.ts
├── streaming/             # Incremental parsing infrastructure
│   ├── buffer.ts           # Streaming buffer
│   ├── state.ts            # Parser state machine
│   └── chunk.ts            # Chunk processor
├── parsing/               # Core parsing infrastructure
│   ├── context.ts          # Parsing context
│   ├── registry.ts         # Parser registry
│   ├── priority.ts         # Priority system
│   ├── block.ts            # Block parsing engine
│   └── inline.ts           # Inline parsing engine
├── parsers/               # Individual parser implementations
│   ├── block/             # Block parsers
│   │   ├── paragraph.ts    # Paragraph (default)
│   │   ├── section.ts      # Section
│   │   ├── list.ts         # Lists
│   │   ├── definition.ts   # Definition list
│   │   ├── table.ts        # Table
│   │   ├── preformatted.ts # Pre blocks (old + new)
│   │   ├── meta.ts         # Metadata
│   │   ├── title.ts        # Title
│   │   ├── separator.ts    # Content separator
│   │   ├── tagged.ts       # Tagged block
│   │   └── comment.ts      # Comment
│   └── inline/            # Inline parsers
│       ├── text.ts         # Text handling
│       ├── emphasis.ts     # Emphasis (*, _)
│       ├── code.ts         # Code (`)
│       ├── link.ts         # Links [text](url)
│       ├── target.ts       # Targets |name|
│       ├── markup.ts       # Markup <custom>
│       ├── special.ts      # Arrows, dashes, dots
│       └── entity.ts       # Entities (&...;)
├── utils/                 # Shared utilities
│   ├── types.ts            # Core interfaces
│   ├── cursor.ts           # Character navigation
│   ├── position.ts         # Position tracking
│   └── indent.ts           # Indentation handling
├── texto.ts               # Main TextoParser class
└── index.ts               # Public exports

tests/
├── unit-cursor.test.ts
├── unit-position.test.ts
├── unit-indent.test.ts
├── unit-node.test.ts
├── unit-tree.test.ts
├── unit-builder.test.ts
├── unit-registry.test.ts
├── unit-block-engine.test.ts
├── unit-inline-engine.test.ts
├── unit-paragraph-recognition.test.ts
├── unit-section-recognition.test.ts
├── unit-list-recognition.test.ts
├── unit-definition-recognition.test.ts
├── unit-table-recognition.test.ts
├── unit-emphasis-parse.test.ts
├── unit-code-parse.test.ts
├── unit-link-parse.test.ts
├── int-full-document.test.ts
├── int-python-compat.test.ts
├── stream-buffer.test.ts
├── stream-chunk-boundary.test.ts
├── stream-split-blocks.test.ts
├── stream-pause-resume.test.ts
└── fixtures/              # Test fixtures from Python
    ├── syntax-lists.txto
    ├── syntax-sections.txto
    └── ...
```

## Test Naming Convention

Tests use **bun test** with pattern: `tests/${group}-{module/feature}.test.ts`

- `unit-*` - Unit tests for individual modules
- `int-*` - Integration tests (full features)
- `stream-*` - Streaming-specific tests

## Module Responsibilities

**document/** - Document tree construction and manipulation
- Creating nodes (element, text, comment)
- Tree navigation (parent, children, siblings)
- Section hierarchy management

**streaming/** - Incremental/streaming parsing support
- Buffer management for incomplete chunks
- State serialization/deserialization
- Chunk boundary detection

**parsing/** - Core parsing infrastructure
- Parser registry with priority-based selection
- Block and inline parsing engines
- Parsing context (current position, document state)

**parsers/** - Individual parser implementations
- Block parsers: Recognise and process block-level structures
- Inline parsers: Recognise and process inline formatting

**utils/** - Shared utilities used across all modules
- Cursor: Character-by-character navigation
- Position: Line/column/offset tracking
- Indentation: Tab expansion and space counting
