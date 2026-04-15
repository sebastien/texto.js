// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/profiles/texto
// Provides the default parser profile for texto input by creating a parser with
// built-in parser registration.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Default Texto parser profile
// Creates a standard TextoParser with default parser registration

import { TextoParser } from "../texto.ts";

// Function: createTextoParser
// Factory that returns a default `TextoParser` configured for texto markup.
//
// Example:
// ```typescript
// const parser = createTextoParser();
// const doc = parser.parse("= Title\n");
// ```
function createTextoParser(): TextoParser {
	return new TextoParser();
}

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { createTextoParser };

// EOF
