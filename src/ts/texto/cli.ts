// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/cli
// Full surface entry point for Node.js / CLI consumers.
// Re-exports the web APIs plus HTML frontend conversion and CLI utilities.

// Web (slim) surface
export * from "./index.ts";

// -----------------------------------------------------------------------------
// Full frontends (adds HTML input support)
// -----------------------------------------------------------------------------

export {
	DefaultNodeFactory,
	FrontEndProcessor,
	htmlFrontend,
	htmlToDocument,
	htmlToTexto,
} from "./frontends/html.ts";
export type { FrontEndContext, NodeFactory } from "./frontends/html.ts";

export {
	FRONTENDS,
	getAvailableFrontends,
	parseFrontend,
	type FrontendFormat,
} from "./frontends/registry.ts";

// -----------------------------------------------------------------------------
// CLI argument parsing & help
// -----------------------------------------------------------------------------

export {
	args,
	help,
	iargs,
} from "./utils/cli.ts";

export type {
	CLIArgs,
	CLIMeta,
	CLIParam,
	CLIParamError,
	CLIParams,
	CLIParamType,
} from "./utils/cli.ts";

// -----------------------------------------------------------------------------
// Executable entry points
// -----------------------------------------------------------------------------

export { main, renderCommand } from "./cli/index.ts";

// EOF
