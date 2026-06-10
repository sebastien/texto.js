// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/frontends/texto
// Converts native texto markup into the Texto AST.

import { createTextoParser } from "../profiles/texto.ts";
import type { FrontendOptions, InputFrontend } from "./types.ts";

const textoFrontend: InputFrontend = (
	input: string,
	_options: FrontendOptions = {},
) => {
	return createTextoParser().parse(input);
};

export { textoFrontend };

// EOF
