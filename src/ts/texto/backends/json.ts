// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/backends/json
// Implements the backends/json module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
import { formatJSON } from "../formatters/json.ts";
import type { Document } from "../utils/types.ts";
import type { BackendOptions, OutputBackend } from "./types.ts";

const jsonBackend: OutputBackend = (
	doc: Document,
	options: BackendOptions = {},
): string => {
	return formatJSON(doc, { includePositions: options.includePositions });
};

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { jsonBackend };

// EOF
