// The Node surface: everything the web entry offers, plus what a non-browser
// runtime needs. Everything Node-only lives under this directory.
//
// Importing this module registers the domish HTML fallback, so HTML input
// works outside a browser — inherited from ./main.js, which owns the
// registration. The web entry (../index.js) never reaches here and stays
// loadable in a browser with no runtime dependencies.
export * from "../index.js";
export {
  args,
  help,
  iargs
} from "../utils/cli.js";
export { main, renderCommand } from "./main.js";
