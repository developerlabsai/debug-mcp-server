/**
 * MCP Server initialization
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { MCPTools } from './tools.js';
import type { MCPResources } from './resources.js';
import * as logger from '../lib/logger.js';

export class MCPServerManager {
  private server: Server;

  constructor(
    private tools: MCPTools,
    private resources: MCPResources
  ) {
    this.server = new Server(
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

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_debug_reports',
          description: 'List all stored debug reports with metadata',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_debug_report',
          description: 'Get a specific debug report by ID including full logs, error, and screenshot reference',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Report ID',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'ask_user_questions',
          description: 'Send questions to browser user and wait for answers. Opens an interactive Q&A modal in the browser.',
          inputSchema: {
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    text: { type: 'string' },
                    type: { type: 'string', enum: ['text', 'multipleChoice', 'boolean'] },
                    options: { type: 'array', items: { type: 'string' } },
                    required: { type: 'boolean' },
                  },
                  required: ['id', 'text', 'type', 'required'],
                },
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 120000)',
              },
            },
            required: ['questions'],
          },
        },
        {
          name: 'clear_old_reports',
          description: 'Delete debug reports older than specified days',
          inputSchema: {
            type: 'object',
            properties: {
              olderThanDays: {
                type: 'number',
                description: 'Delete reports older than this many days (default: 7)',
              },
            },
          },
        },
      ],
    }));

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'list_debug_reports':
            result = await this.tools.listDebugReports();
            break;

          case 'get_debug_report':
            result = await this.tools.getDebugReport(args as any);
            break;

          case 'ask_user_questions':
            result = await this.tools.askUserQuestions(args as any);
            break;

          case 'clear_old_reports':
            result = await this.tools.clearOldReports(args as any);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Error calling tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'debug://reports/latest',
          name: 'Latest Debug Report',
          description: 'Get the most recent debug report',
          mimeType: 'application/json',
        },
        {
          uri: 'debug://reports/{id}',
          name: 'Debug Report by ID',
          description: 'Get a specific debug report by ID',
          mimeType: 'application/json',
        },
        {
          uri: 'debug://screenshots/{id}',
          name: 'Screenshot by Report ID',
          description: 'Get screenshot image for a specific report',
          mimeType: 'image/png',
        },
      ],
    }));

    // Read a resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        let result;

        if (uri === 'debug://reports/latest') {
          result = await this.resources.getLatestReport();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        const reportsMatch = uri.match(/^debug:\/\/reports\/(.+)$/);
        if (reportsMatch) {
          const reportId = reportsMatch[1];
          result = await this.resources.getReportById(reportId);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        const screenshotsMatch = uri.match(/^debug:\/\/screenshots\/(.+)$/);
        if (screenshotsMatch) {
          const reportId = screenshotsMatch[1];
          const screenshot = await this.resources.getScreenshotById(reportId);
          return {
            contents: [
              {
                uri,
                mimeType: 'image/png',
                blob: screenshot.toString('base64'),
              },
            ],
          };
        }

        throw new Error(`Unknown resource URI: ${uri}`);
      } catch (error) {
        logger.error(`Error reading resource ${uri}:`, error);
        throw error;
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP server started');
  }

  /**
   * Get the server instance
   */
  getServer(): Server {
    return this.server;
  }
}
