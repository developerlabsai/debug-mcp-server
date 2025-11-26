/**
 * Knowledge Base Entries
 *
 * This file contains solutions to common problems encountered during development.
 * ALWAYS search this file before attempting to fix an error.
 * ALWAYS add new solutions when you solve a non-trivial problem.
 */

export type KnowledgeBaseCategory =
  | 'mcp'
  | 'nodejs'
  | 'typescript'
  | 'websocket'
  | 'filesystem'
  | 'general';

export interface KnowledgeBaseEntry {
  id: string;
  category: KnowledgeBaseCategory;
  title: string;
  problem: string;
  errorMessages: string[];
  solution: string;
  codeExample?: string;
  relatedFiles: string[];
  tags: string[];
  dateAdded: string;
}

export const knowledgeBaseEntries: KnowledgeBaseEntry[] = [
  {
    id: 'mcp-001',
    category: 'mcp',
    title: 'MCP SDK Installation and Setup',
    problem: 'First time setting up MCP server with @modelcontextprotocol/sdk',
    errorMessages: [
      'Cannot find module @modelcontextprotocol/sdk',
      'Module not found: Error: Can\'t resolve \'@modelcontextprotocol/sdk\''
    ],
    solution: `
1. Install the MCP SDK: npm install @modelcontextprotocol/sdk
2. Import the correct modules from the SDK
3. Follow the MCP server initialization pattern
4. Ensure TypeScript types are properly configured
    `,
    codeExample: `
// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'debug-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);
    `,
    relatedFiles: ['src/mcp/server.ts', 'package.json'],
    tags: ['mcp', 'setup', 'installation', 'sdk'],
    dateAdded: '2025-11-26',
  },

  // Add more entries as problems are solved
];

/**
 * Search knowledge base by error message
 */
export function searchByError(errorMessage: string): KnowledgeBaseEntry[] {
  return knowledgeBaseEntries.filter(entry =>
    entry.errorMessages.some(msg =>
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    )
  );
}

/**
 * Search knowledge base by tag
 */
export function searchByTag(tag: string): KnowledgeBaseEntry[] {
  return knowledgeBaseEntries.filter(entry =>
    entry.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Search knowledge base by category
 */
export function searchByCategory(category: KnowledgeBaseCategory): KnowledgeBaseEntry[] {
  return knowledgeBaseEntries.filter(entry => entry.category === category);
}
