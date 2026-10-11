// Executable entry point: the server surface plus a main() call when run
// directly. Used by bin/texto. Kept separate from index.js so that importing
// the server surface never has the side effect of running the CLI.
export * from "./index.js";
import { main } from "./main.js";
if (import.meta.main) {
  main().catch((error) => {
    console.error(`Fatal error: ${error}`);
    process.exit(2);
  });
}
export { main, renderCommand } from "./main.js";
