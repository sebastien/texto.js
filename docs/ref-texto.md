# Texto Syntax Reference

Texto is a lightweight markup language designed for writing structured documents. This guide provides a quick reference to the standard Texto syntax.

## Document Structure

### Document Title & Metadata
The document title is denoted by `== ` at the very beginning of the document. Metadata can be added immediately following the title using `-- key: value`.

```texto
== My Document Title
-- author: John Doe
-- date: 2023-10-27

Document content starts here...
```

### Sections
Texto supports three styles of section headings:

**1. Underline Style:**
```texto
Major Section
=============

Subsection
----------
```

**2. Hash Style:**
```texto
# Major Section
## Subsection
### Sub-subsection
```

**3. Numbered Style:**
```texto
1. Major Section
1.1. Subsection
1.1.1. Sub-subsection
```

## Block Elements

### Paragraphs
Paragraphs are simply blocks of text separated by one or more blank lines.

### Lists
Texto supports several types of lists. List items can span multiple lines if the subsequent lines are indented to match the list marker.

**Unordered Lists:**
Use `-`, `*`, or `+` as markers.
```texto
- First item
- Second item
  with multiple lines
- Third item
```

**Ordered Lists:**
Use numbers followed by `)` or `.`.
```texto
1) First step
2) Second step
```

**Task Lists:**
```texto
[ ] Pending task
[x] Completed task
```

**Definition Lists:**
Terms end with `::` and definitions are indented on the following lines.
```texto
Texto::
   A lightweight markup language.

Markdown::
   Another popular markup language.
```

### Blockquotes
Use `>` at the start of a line to create a blockquote.
```texto
> This is a blockquote.
> It can span multiple lines.
```

### Preformatted Code Blocks
Texto supports both fenced and indented code blocks.

**Fenced Blocks:**
```texto
```javascript
function hello() {
  console.log("Hello, world!");
}
```
```

**Indented Blocks (Legacy):**
Use `>   ` (greater-than followed by a tab or at least 3 spaces).
```texto
>   // Some preformatted text
>   line 1
>   line 2
```

### Tagged Blocks
Tagged blocks are useful for special content like notes, warnings, or examples. They start with an alphanumeric tag (starting with a capital letter) followed by at least three underscores `___`, and end with a line of underscores matching the opening indentation.

```texto
Note___________________________________
This is a special note block.
It can contain multiple paragraphs.
_______________________________________
```

### Horizontal Rules
Three or more hyphens `-`, asterisks `*`, or underscores `_` on a line by themselves create a horizontal rule.

```texto
---
***
___
```

## Inline Elements

### Emphasis
- **Strong/Bold:** `**bold**` or `__bold__`
- **Emphasis/Italic:** `*italic*` or `_italic_`

### Code
Use backticks for inline code: `` `console.log("Hello")` ``. For code containing backticks, use multiple backticks: ```` `` `code` `` ````.

### Links
Texto supports several link formats:

- **Automatic Links:** `<http://example.com>` or `<email@example.com>`
- **Inline Links:** `[Link Text](http://example.com "Optional Title")`
- **Reference Links:** `[Link Text][ref-id]` or simply `[ref-id]`

**Reference Definitions:**
Define reference targets anywhere in the document:
```texto
[ref-id]: http://example.com "Optional Title"
```

### Targets
You can define specific targets (anchors) within your text for cross-referencing:

```texto
|TARGET| Invisible target marker
|TARGET:Visible Text| Target with visible text
```

### Escaping
Use a backslash `\` to escape special characters: `\*not italic\*`.
For larger blocks of text or text containing markup, you can use the escape block syntax: `<[ escaped _markup_ ]>`.
