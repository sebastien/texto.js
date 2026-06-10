// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-06-19

// Module: texto/frontends/index
// Re-exports the frontend registry and built-in frontends.

export type { FrontEndContext, NodeFactory } from "./html.ts";
export {
	DefaultNodeFactory,
	FrontEndProcessor,
	htmlFrontend,
	htmlToDocument,
	htmlToTexto,
} from "./html.ts";
export { markdownFrontend } from "./markdown.ts";
export {
	FRONTENDS,
	type FrontendFormat,
	type FrontendOptions,
	getAvailableFrontends,
	type InputFrontend,
	parseFrontend,
} from "./registry.ts";
export { textoFrontend } from "./texto.ts";

// EOF
