# CLI Improvement

We'd like to improve the CLI experience.

For `texto`:

- `-f|--from` to indicate the "parser profile", autodetected by default
- `-t|--to` to support the output formats, including json, html, xml, texto (default HTML)
- `-o|--output` to specify an output path, stdout by default.

Now, `texto parse` should only format the AST and export it to JSON, and support the same `-f|--from` format.

Then,  `texto format` should by default format to texto, and as input take either texto/markdown, or detect JSON and restore the AST and then render it.

So `texto` works as the main CLI, and then `parse`/`format` can be used to export/import and analyse.


