// Texto Parser - Server/CLI Entry Point
// Re-exports all browser-safe APIs plus Node.js-specific CLI functionality

// Import CLI functionality
import {
	type FormatOptions,
	formatCommand,
	main,
	type ParseOptions,
	parseCommand,
} from "./cli/index.ts";

// Re-export CLI functionality
export {
	type FormatOptions,
	formatCommand,
	main,
	type ParseOptions,
	parseCommand,
};

// Re-export all browser-safe APIs from core index
export * from "./index.ts";

// Run CLI when executed directly
if (import.meta.main) {
	main().catch((error) => {
		console.error(`Fatal error: ${error}`);
		process.exit(2);
	});
}
// EOF
