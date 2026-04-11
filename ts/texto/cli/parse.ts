// CLI parse command - Parse texto to JSON AST

import { TextoParser } from '../texto.ts';
import { formatJSON } from '../formatters/json.ts';
import { readFileSync } from 'fs';

export interface ParseOptions {
  file?: string;
  includePositions?: boolean;
}

export async function parseCommand(options: ParseOptions): Promise<string> {
  let input: string;
  
  // Read input from file or stdin
  if (options.file) {
    try {
      input = readFileSync(options.file, 'utf8');
    } catch (error) {
      throw new Error(`Cannot read file: ${options.file} - ${error}`);
    }
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    input = Buffer.concat(chunks).toString('utf8');
  }
  
  // Parse the document
  const parser = new TextoParser();
  const doc = parser.parse(input);
  
  // Format as JSON
  return formatJSON(doc, { includePositions: options.includePositions });
}
