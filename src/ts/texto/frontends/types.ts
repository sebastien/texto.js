// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/frontends/types
// Declares common contracts for converting source formats into the Texto AST.

import type { Document } from "../utils/types.ts";

interface FrontendOptions {
	strict?: boolean;
}

type InputFrontend = (input: string, options?: FrontendOptions) => Document;

export type { FrontendOptions, InputFrontend };

// EOF
