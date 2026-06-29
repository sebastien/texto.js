// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/backends/index
// Registers output backends and exposes backend discovery and rendering helpers.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
import type { Document } from "../utils/types.ts";
import { Registry } from "../utils/registry.ts";
import { htmlBackend } from "./html.ts";
import { jsonBackend } from "./json.ts";
import { markdownBackend } from "./markdown.ts";
import { textoBackend } from "./texto.ts";
import type { BackendOptions, OutputBackend } from "./types.ts";
import { xmlBackend } from "./xml.ts";

// Use the common Registry abstraction for backend storage
const BACKENDS = new Registry<string, OutputBackend>();
BACKENDS.register("json", jsonBackend);
BACKENDS.register("xml", xmlBackend);
BACKENDS.register("html", htmlBackend);
BACKENDS.register("texto", textoBackend);
BACKENDS.register("markdown", markdownBackend);

// Type: BackendFormat
// Enumerates registered backend format keys.
type BackendFormat = string;

// Function: getAvailableBackends
// Returns the list of available backend format names.
function getAvailableBackends(): BackendFormat[] {
	return BACKENDS.keys();
}

// Function: renderBackend
// Renders `doc` with the backend selected by `format` and optional `options`.
function renderBackend(
	doc: Document,
	format: string,
	options: BackendOptions = {},
): string {
	const normalized = format.toLowerCase();
	const backend = BACKENDS.get(normalized);

	if (!backend) {
		const available = getAvailableBackends().join(", ");
		throw new Error(
			`Unknown output type: ${format}. Available backends: ${available}`,
		);
	}

	return backend(doc, options);
}

export type { BackendFormat, BackendOptions, OutputBackend };
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export {
	getAvailableBackends,
	htmlBackend,
	jsonBackend,
	markdownBackend,
	renderBackend,
	textoBackend,
	xmlBackend,
};

// EOF
