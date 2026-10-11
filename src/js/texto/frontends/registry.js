import { Registry } from "../utils/registry.js";
import { htmlFrontend } from "./html.js";
import { markdownFrontend } from "./markdown.js";
import { textoFrontend } from "./texto.js";
const FRONTENDS = new Registry;
FRONTENDS.register("texto", textoFrontend);
FRONTENDS.register("markdown", markdownFrontend);
FRONTENDS.register("md", markdownFrontend);
FRONTENDS.register("html", htmlFrontend);
function getAvailableFrontends() {
  return FRONTENDS.keys();
}
function parseFrontend(input, format, options = {}) {
  const normalized = format.toLowerCase();
  const frontend = FRONTENDS.get(normalized);
  if (!frontend) {
    const available = getAvailableFrontends().join(", ");
    throw new Error(`Unknown input type: ${format}. Available frontends: ${available}`);
  }
  return frontend(input, options);
}

export { FRONTENDS, getAvailableFrontends, parseFrontend };
