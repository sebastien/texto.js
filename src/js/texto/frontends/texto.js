import { createTextoParser } from "../profiles/texto.js";
const textoFrontend = (input, _options = {}) => {
  return createTextoParser().parse(input);
};

export { textoFrontend };
