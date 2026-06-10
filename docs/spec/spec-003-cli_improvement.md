# CLI Improvement

We'd like to improve the CLI experience.

For `texto`:

- `-f|--from` to indicate the "parser profile", autodetected by default
- `-t|--to` to support the output formats, including json, html, xml, texto (default HTML)
- `-o|--output` to specify an output path, stdout by default.

Now, `texto` is the only CLI entry point.

It should accept `-f|--from` and `-t|--to` to convert between texto, markdown, html, json, and xml, with input and output formats inferred from file extensions when set to `auto`.

Subcommands such as `parse`, `format`, and `convert` are removed so there is a single conversion pipeline:

`input -> frontend -> AST -> backend -> output`

