// Project: texto.js
// Author:  Sebastien Pierre
// License: MIT
// Created: 2026-04-15

// Module: texto/server
// Implements the server module for texto parsing and formatting workflows.

// ----------------------------------------------------------------------------
//
// IMPLEMENTATION
//
// ----------------------------------------------------------------------------
// Texto Parser - Server/CLI Entry Point
// Re-exports all browser-safe APIs plus Node.js-specific CLI functionality

// Import CLI functionality
import { main, renderCommand } from "./cli/index.ts";

// Re-export CLI functionality

// Re-export all browser-safe APIs from core index

// Run CLI when executed directly
if (import.meta.main) {
	main().catch((error) => {
		console.error(`Fatal error: ${error}`);
		process.exit(2);
	});
}

export * from "./index.ts";
// ----------------------------------------------------------------------------
//
// EXPORTS
//
// ----------------------------------------------------------------------------
export { main, renderCommand };

// EOF
