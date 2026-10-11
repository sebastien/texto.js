import { createMarkdownParser } from "../profiles/markdown.js";
const markdownFrontend = (input, _options = {}) => {
  return createMarkdownParser().parse(input);
};

export { markdownFrontend };
