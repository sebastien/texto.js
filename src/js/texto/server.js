export * from "./cli.js";
import { main } from "./cli/index.js";
if (import.meta.main) {
  main().catch((error) => {
    console.error(`Fatal error: ${error}`);
    process.exit(2);
  });
}
export { main, renderCommand } from "./cli/index.js";
