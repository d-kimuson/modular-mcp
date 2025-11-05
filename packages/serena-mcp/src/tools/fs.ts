import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { globSync } from "glob";

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

export const fsTools: Tool[] = [
  {
    name: "mcp__serena__read_file",
    description: "Read the contents of a file. For large files, use range parameters to read specific portions.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file to read",
        },
        start: {
          type: "number",
          description: "Starting line number (1-indexed, optional)",
        },
        end: {
          type: "number",
          description: "Ending line number (1-indexed, optional)",
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      try {
        const path = resolve(String(args.path));
        const content = await readFile(path, "utf-8");

        if (args.start !== undefined || args.end !== undefined) {
          const lines = content.split("\n");
          const start = Math.max(0, (Number(args.start) || 1) - 1);
          const end = Math.min(lines.length, Number(args.end) || lines.length);
          const selectedLines = lines.slice(start, end);

          return {
            content: [{
              type: "text",
              text: `File: ${path} (lines ${start + 1}-${end})\n\n${selectedLines.join("\n")}`,
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: `File: ${path}\n\n${content}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__create_text_file",
    description: "Create or overwrite a text file with the given content.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path where the file should be created",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["path", "content"],
    },
    handler: async (args) => {
      try {
        const path = resolve(String(args.path));
        await writeFile(path, String(args.content), "utf-8");

        return {
          content: [{
            type: "text",
            text: `Successfully created file: ${path}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating file: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__list_dir",
    description: "List contents of a directory.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the directory to list",
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      try {
        const dirPath = resolve(String(args.path));
        const entries = await readdir(dirPath, { withFileTypes: true });

        const items = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = join(dirPath, entry.name);
            const stats = await stat(fullPath);
            const type = entry.isDirectory() ? "dir" : "file";
            const size = stats.size;
            return `${type.padEnd(4)} ${entry.name.padEnd(40)} ${size} bytes`;
          })
        );

        return {
          content: [{
            type: "text",
            text: `Directory: ${dirPath}\n\n${items.join("\n")}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__find_file",
    description: "Find files matching a glob pattern.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern to match files (e.g., '**/*.ts')",
        },
        cwd: {
          type: "string",
          description: "Working directory to search from (default: process.cwd())",
        },
      },
      required: ["pattern"],
    },
    handler: async (args) => {
      try {
        const cwd = args.cwd ? resolve(String(args.cwd)) : process.cwd();
        const pattern = String(args.pattern);

        const files = globSync(pattern, { cwd, nodir: true });

        return {
          content: [{
            type: "text",
            text: `Found ${files.length} files matching "${pattern}":\n\n${files.join("\n")}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error finding files: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__replace_regex",
    description: "Replace text in a file using regular expressions. Use with caution to avoid catastrophic backtracking.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file",
        },
        pattern: {
          type: "string",
          description: "Regular expression pattern to match",
        },
        replacement: {
          type: "string",
          description: "Replacement text",
        },
        flags: {
          type: "string",
          description: "Regular expression flags (e.g., 'g', 'gi')",
        },
      },
      required: ["path", "pattern", "replacement"],
    },
    handler: async (args) => {
      try {
        const path = resolve(String(args.path));
        const content = await readFile(path, "utf-8");
        const flags = String(args.flags || "g");
        const regex = new RegExp(String(args.pattern), flags);
        const replacement = String(args.replacement);

        const newContent = content.replace(regex, replacement);
        await writeFile(path, newContent, "utf-8");

        return {
          content: [{
            type: "text",
            text: `Successfully replaced pattern in ${path}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error replacing text: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__search_for_pattern",
    description: "Search for a pattern in files using regular expressions.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Regular expression pattern to search for",
        },
        filePattern: {
          type: "string",
          description: "Glob pattern for files to search (e.g., '**/*.ts')",
        },
        cwd: {
          type: "string",
          description: "Working directory to search from (default: process.cwd())",
        },
      },
      required: ["pattern", "filePattern"],
    },
    handler: async (args) => {
      try {
        const cwd = args.cwd ? resolve(String(args.cwd)) : process.cwd();
        const pattern = new RegExp(String(args.pattern), "g");
        const filePattern = String(args.filePattern);

        const files = globSync(filePattern, { cwd, nodir: true });
        const results: string[] = [];

        for (const file of files) {
          const filePath = join(cwd, file);
          const content = await readFile(filePath, "utf-8");
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              results.push(`${file}:${index + 1}: ${line.trim()}`);
            }
            // Reset regex lastIndex for next iteration
            pattern.lastIndex = 0;
          });
        }

        return {
          content: [{
            type: "text",
            text: `Found ${results.length} matches:\n\n${results.join("\n")}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error searching: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
];
