import { Registry } from "../utils/registry.js";
import { htmlBackend } from "./html.js";
import { jsonBackend } from "./json.js";
import { markdownBackend } from "./markdown.js";
import { textoBackend } from "./texto.js";
import { xmlBackend } from "./xml.js";
const BACKENDS = new Registry;
BACKENDS.register("json", jsonBackend);
BACKENDS.register("xml", xmlBackend);
BACKENDS.register("html", htmlBackend);
BACKENDS.register("texto", textoBackend);
BACKENDS.register("markdown", markdownBackend);
function getAvailableBackends() {
  return BACKENDS.keys();
}
function renderBackend(doc, format, options = {}) {
  const normalized = format.toLowerCase();
  const backend = BACKENDS.get(normalized);
  if (!backend) {
    const available = getAvailableBackends().join(", ");
    throw new Error(`Unknown output type: ${format}. Available backends: ${available}`);
  }
  return backend(doc, options);
}

export {
  getAvailableBackends,
  htmlBackend,
  jsonBackend,
  markdownBackend,
  renderBackend,
  textoBackend,
  xmlBackend
};
