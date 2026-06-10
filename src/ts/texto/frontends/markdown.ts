// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/frontends/markdown
// Converts Markdown markup into the Texto AST.

import { createMarkdownParser } from "../profiles/markdown.ts";
import type { FrontendOptions, InputFrontend } from "./types.ts";

const markdownFrontend: InputFrontend = (
	input: string,
	_options: FrontendOptions = {},
) => {
	return createMarkdownParser().parse(input);
};

export { markdownFrontend };

// EOF
