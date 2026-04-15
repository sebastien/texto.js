// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/backends/types
// Declares backend contracts used by renderers that convert document trees to output
// formats such as JSON, HTML, XML, or texto markup.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
import type { Document } from "../utils/types.ts";

// Type: BackendOptions
// Configures optional backend rendering behavior.
// - includePositions: boolean | undefined - Includes source positions in rendered output.
interface BackendOptions {
	includePositions?: boolean;
}

// Type: OutputBackend
// Defines a backend function that renders `doc` using optional `options`.
type OutputBackend = (doc: Document, options?: BackendOptions) => string;

// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export type { BackendOptions, OutputBackend };

// EOF
