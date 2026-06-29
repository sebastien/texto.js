// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/server
// Executable + full surface entry point (Node / CLI).
// Re-exports the complete API (web + HTML frontend + CLI) and runs the CLI when invoked directly.

// Full surface (includes HTML frontend + CLI)
export * from "./cli.ts";

// -----------------------------------------------------------------------------
// Executable behavior
// -----------------------------------------------------------------------------

import { main } from "./cli/index.ts";

// Run CLI when executed directly (e.g. `bun run src/ts/texto/server.ts` or compiled binary)
if (import.meta.main) {
	main().catch((error) => {
		console.error(`Fatal error: ${error}`);
		process.exit(2);
	});
}

export { main, renderCommand } from "./cli/index.ts";

// EOF
