// Node-side wiring for the HTML frontend.
//
// Browsers provide DOMParser, so frontends/html.js stays dependency-free.
// This module is the only place that pulls in the domish parser (a .ts
// dependency outside the package), and it registers it as the fallback used
// when DOMParser is absent. It is imported for its side effect by the server
// surface (server/index.js) before any HTML is parsed outside a browser.
import { parse as parseWithDomish } from "../../../../deps/domish.js/src/ts/domish/xmlish.ts";
import { setHtmlParser } from "../frontends/html.js";

setHtmlParser((html) => parseWithDomish(html).body);
