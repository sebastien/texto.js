// CLI index - Main entry point for texto command-line tool

import { help, type CLIParams, type CLIMeta } from '../utils/cli.ts';
import { parseCommand, type ParseOptions } from './parse.ts';
import { formatCommand, type FormatOptions } from './format.ts';

const meta: CLIMeta = {
  command: 'texto',
  description: 'Parse and format Texto documents',
  version: '1.0.0',
  width: 80
};

// Parse simple flags manually
function parseFlags(args: string[]): { flags: Map<string, string | boolean>; positional: string[] } {
  const flags = new Map<string, string | boolean>();
  const positional: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx > 0) {
        // --flag=value
        const name = arg.slice(2, eqIdx);
        const value = arg.slice(eqIdx + 1);
        flags.set(name, value);
      } else if (arg.startsWith('--no-')) {
        // --no-flag
        flags.set(arg.slice(5), false);
      } else {
        // --flag (boolean)
        flags.set(arg.slice(2), true);
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag(s)
      const flagStr = arg.slice(1);
      for (const char of flagStr) {
        flags.set(char, true);
      }
    } else {
      // Positional argument
      positional.push(arg);
    }
  }
  
  return { flags, positional };
}

async function main(): Promise<void> {
  const commandArgs = process.argv.slice(2);
  
  // No arguments or help flag
  if (commandArgs.length === 0) {
    printUsage();
    process.exit(0);
  }
  
  const firstArg = commandArgs[0];
  
  // Help flag
  if (firstArg === '--help' || firstArg === '-h') {
    printUsage();
    process.exit(0);
  }
  
  // Version flag
  if (firstArg === '--version' || firstArg === '-v') {
    console.log(meta.version);
    process.exit(0);
  }
  
  const command = firstArg;
  const remainingArgs = commandArgs.slice(1);
  
  try {
    switch (command) {
      case 'parse':
        await handleParse(remainingArgs);
        break;
      
      case 'format':
        await handleFormat(remainingArgs);
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

async function handleParse(argsList: string[]): Promise<void> {
  const { flags, positional } = parseFlags(argsList);
  
  if (flags.has('help') || flags.has('h')) {
    console.log('Usage: texto parse [options] [file]');
    console.log('');
    console.log('Parse texto document to JSON AST');
    console.log('');
    console.log('Options:');
    console.log('  -h, --help       Show help');
    console.log('  -p, --positions  Include source positions');
    console.log('');
    console.log('Arguments:');
    console.log('  file             Input file (reads stdin if not provided)');
    process.exit(0);
  }
  
  const options: ParseOptions = {
    file: positional[0],
    includePositions: flags.has('positions') || flags.has('p')
  };
  
  const output = await parseCommand(options);
  console.log(output);
}

async function handleFormat(argsList: string[]): Promise<void> {
  const { flags, positional } = parseFlags(argsList);
  
  if (flags.has('help') || flags.has('h')) {
    console.log('Usage: texto format [options] [file]');
    console.log('');
    console.log('Parse and re-format texto document');
    console.log('');
    console.log('Options:');
    console.log('  -h, --help       Show help');
    console.log('');
    console.log('Arguments:');
    console.log('  file             Input file (reads stdin if not provided)');
    process.exit(0);
  }
  
  const options: FormatOptions = {
    file: positional[0]
  };
  
  const output = await formatCommand(options);
  console.log(output);
}

function printUsage(): void {
  console.log(`${meta.command} ${meta.version}`);
  console.log('');
  console.log(meta.description);
  console.log('');
  console.log('Usage:');
  console.log('  texto parse [options] [file]    Parse texto to JSON AST');
  console.log('  texto format [options] [file]   Parse and re-format texto');
  console.log('  texto --help                    Show this help');
  console.log('  texto --version                 Show version');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help                      Show help message');
  console.log('  -p, --positions                 Include source positions');
  console.log('');
  console.log('Examples:');
  console.log('  texto parse document.txto        Parse file to JSON');
  console.log('  texto parse -p document.txto     Parse with positions');
  console.log('  echo "Hello" | texto format      Parse stdin and reformat');
}

// Run CLI
if (import.meta.main) {
  main().catch((error) => {
    console.error(`Fatal error: ${error}`);
    process.exit(2);
  });
}

export { main, parseCommand, formatCommand };
