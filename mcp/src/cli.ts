#!/usr/bin/env node
// stdio entry: node mcp/dist/cli.js --corpus <dir>  (or CIV_ENGINE_CORPUS).
// v1 is unpublished (private package); the bin name is reserved for a future
// publish step that rewrites the file: dependency.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server.js';

function corpusRootFromArgs(argv: string[]): string | null {
  const i = argv.indexOf('--corpus');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env.CIV_ENGINE_CORPUS ?? null;
}

const root = corpusRootFromArgs(process.argv.slice(2));
if (!root) {
  console.error('civ-engine-mcp: pass --corpus <dir> or set CIV_ENGINE_CORPUS');
  process.exit(2);
}

const server = buildServer(root);
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`civ-engine-mcp: serving corpus at ${root} over stdio`);
