import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
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

// Helper to find symbols (functions, classes, etc.) in code
function findSymbols(content: string, symbolName?: string): Array<{
  name: string;
  type: string;
  line: number;
  endLine: number;
}> {
  const symbols: Array<{
    name: string;
    type: string;
    line: number;
    endLine: number;
  }> = [];

  const lines = content.split("\n");

  // Match functions, classes, interfaces, types
  const patterns = [
    { type: "function", regex: /(?:function|const|let|var)\s+(\w+)\s*[=:(]/ },
    { type: "class", regex: /class\s+(\w+)/ },
    { type: "interface", regex: /interface\s+(\w+)/ },
    { type: "type", regex: /type\s+(\w+)\s*=/ },
    { type: "export", regex: /export\s+(?:const|let|var|function|class)\s+(\w+)/ },
  ];

  lines.forEach((line, index) => {
    for (const { type, regex } of patterns) {
      const match = line.match(regex);
      if (match) {
        const name = match[1];
        if (!symbolName || name === symbolName) {
          symbols.push({
            name,
            type,
            line: index + 1,
            endLine: index + 1, // Simplified: just the declaration line
          });
        }
      }
    }
  });

  return symbols;
}

export const codeTools: Tool[] = [
  {
    name: "mcp__serena__get_symbols_overview",
    description: "Get an overview of symbols (functions, classes, etc.) in a file or directory.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to file or directory",
        },
        filePattern: {
          type: "string",
          description: "Glob pattern for files (default: '**/*.{ts,js,tsx,jsx}')",
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      try {
        const path = resolve(String(args.path));
        const filePattern = String(args.filePattern || "**/*.{ts,js,tsx,jsx}");

        const files = globSync(filePattern, { cwd: path, nodir: true });
        const allSymbols: Array<{ file: string; symbols: ReturnType<typeof findSymbols> }> = [];

        for (const file of files.slice(0, 50)) { // Limit to 50 files
          const filePath = join(path, file);
          const content = await readFile(filePath, "utf-8");
          const symbols = findSymbols(content);
          if (symbols.length > 0) {
            allSymbols.push({ file, symbols });
          }
        }

        const output = allSymbols
          .map(({ file, symbols }) => {
            const symbolList = symbols
              .map((s) => `  - ${s.type}: ${s.name} (line ${s.line})`)
              .join("\n");
            return `${file}:\n${symbolList}`;
          })
          .join("\n\n");

        return {
          content: [{
            type: "text",
            text: `Symbols overview:\n\n${output}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting symbols: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__find_symbol",
    description: "Find a specific symbol definition in the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        symbolName: {
          type: "string",
          description: "Name of the symbol to find",
        },
        path: {
          type: "string",
          description: "Path to search in (default: current directory)",
        },
        filePattern: {
          type: "string",
          description: "Glob pattern for files (default: '**/*.{ts,js,tsx,jsx}')",
        },
      },
      required: ["symbolName"],
    },
    handler: async (args) => {
      try {
        const symbolName = String(args.symbolName);
        const path = args.path ? resolve(String(args.path)) : process.cwd();
        const filePattern = String(args.filePattern || "**/*.{ts,js,tsx,jsx}");

        const files = globSync(filePattern, { cwd: path, nodir: true });
        const results: Array<{ file: string; line: number; content: string }> = [];

        for (const file of files.slice(0, 100)) { // Limit to 100 files
          const filePath = join(path, file);
          const content = await readFile(filePath, "utf-8");
          const symbols = findSymbols(content, symbolName);

          for (const symbol of symbols) {
            const lines = content.split("\n");
            const contextStart = Math.max(0, symbol.line - 3);
            const contextEnd = Math.min(lines.length, symbol.line + 2);
            const context = lines.slice(contextStart, contextEnd).join("\n");

            results.push({
              file,
              line: symbol.line,
              content: context,
            });
          }
        }

        if (results.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Symbol "${symbolName}" not found`,
            }],
          };
        }

        const output = results
          .map((r) => `${r.file}:${r.line}\n\`\`\`\n${r.content}\n\`\`\``)
          .join("\n\n");

        return {
          content: [{
            type: "text",
            text: `Found "${symbolName}":\n\n${output}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error finding symbol: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__find_referencing_symbols",
    description: "Find all references to a symbol in the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        symbolName: {
          type: "string",
          description: "Name of the symbol to find references for",
        },
        path: {
          type: "string",
          description: "Path to search in (default: current directory)",
        },
        filePattern: {
          type: "string",
          description: "Glob pattern for files (default: '**/*.{ts,js,tsx,jsx}')",
        },
      },
      required: ["symbolName"],
    },
    handler: async (args) => {
      try {
        const symbolName = String(args.symbolName);
        const path = args.path ? resolve(String(args.path)) : process.cwd();
        const filePattern = String(args.filePattern || "**/*.{ts,js,tsx,jsx}");

        const files = globSync(filePattern, { cwd: path, nodir: true });
        const results: Array<{ file: string; line: number; content: string }> = [];

        const symbolRegex = new RegExp(`\\b${symbolName}\\b`, "g");

        for (const file of files.slice(0, 100)) {
          const filePath = join(path, file);
          const content = await readFile(filePath, "utf-8");
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            if (symbolRegex.test(line)) {
              results.push({
                file,
                line: index + 1,
                content: line.trim(),
              });
            }
            symbolRegex.lastIndex = 0;
          });
        }

        const output = results
          .map((r) => `${r.file}:${r.line}: ${r.content}`)
          .join("\n");

        return {
          content: [{
            type: "text",
            text: `Found ${results.length} references to "${symbolName}":\n\n${output}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error finding references: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__replace_symbol_body",
    description: "Replace the body of a symbol (function, class, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file",
        },
        symbolName: {
          type: "string",
          description: "Name of the symbol to replace",
        },
        newBody: {
          type: "string",
          description: "New body content",
        },
      },
      required: ["path", "symbolName", "newBody"],
    },
    handler: async (args) => {
      try {
        const path = resolve(String(args.path));
        const symbolName = String(args.symbolName);
        const newBody = String(args.newBody);

        const content = await readFile(path, "utf-8");

        // Simple implementation: find the symbol and replace its content
        // This is a simplified version; a real implementation would use an AST
        const lines = content.split("\n");
        const symbols = findSymbols(content, symbolName);

        if (symbols.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Symbol "${symbolName}" not found in ${path}`,
            }],
            isError: true,
          };
        }

        // For simplicity, just note that this is a placeholder implementation
        return {
          content: [{
            type: "text",
            text: `Note: replace_symbol_body is a simplified implementation. Found symbol "${symbolName}" at line ${symbols[0].line}. For actual replacement, use a code editor or IDE with AST support.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error replacing symbol body: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__insert_after_symbol",
    description: "Insert code after a symbol definition.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file",
        },
        symbolName: {
          type: "string",
          description: "Name of the symbol",
        },
        content: {
          type: "string",
          description: "Content to insert",
        },
      },
      required: ["path", "symbolName", "content"],
    },
    handler: async (args) => {
      try {
        const path = resolve(String(args.path));
        const symbolName = String(args.symbolName);
        const insertContent = String(args.content);

        const content = await readFile(path, "utf-8");
        const symbols = findSymbols(content, symbolName);

        if (symbols.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Symbol "${symbolName}" not found in ${path}`,
            }],
            isError: true,
          };
        }

        const lines = content.split("\n");
        const insertLine = symbols[0].endLine;
        lines.splice(insertLine, 0, insertContent);

        await writeFile(path, lines.join("\n"), "utf-8");

        return {
          content: [{
            type: "text",
            text: `Inserted content after "${symbolName}" at line ${insertLine} in ${path}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error inserting after symbol: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__insert_before_symbol",
    description: "Insert code before a symbol definition.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file",
        },
        symbolName: {
          type: "string",
          description: "Name of the symbol",
        },
        content: {
          type: "string",
          description: "Content to insert",
        },
      },
      required: ["path", "symbolName", "content"],
    },
    handler: async (args) => {
      try {
        const path = resolve(String(args.path));
        const symbolName = String(args.symbolName);
        const insertContent = String(args.content);

        const content = await readFile(path, "utf-8");
        const symbols = findSymbols(content, symbolName);

        if (symbols.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Symbol "${symbolName}" not found in ${path}`,
            }],
            isError: true,
          };
        }

        const lines = content.split("\n");
        const insertLine = symbols[0].line - 1;
        lines.splice(insertLine, 0, insertContent);

        await writeFile(path, lines.join("\n"), "utf-8");

        return {
          content: [{
            type: "text",
            text: `Inserted content before "${symbolName}" at line ${insertLine + 1} in ${path}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error inserting before symbol: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__rename_symbol",
    description: "Rename a symbol throughout the codebase (simple text replacement).",
    inputSchema: {
      type: "object",
      properties: {
        oldName: {
          type: "string",
          description: "Current name of the symbol",
        },
        newName: {
          type: "string",
          description: "New name for the symbol",
        },
        path: {
          type: "string",
          description: "Path to search in (default: current directory)",
        },
        filePattern: {
          type: "string",
          description: "Glob pattern for files (default: '**/*.{ts,js,tsx,jsx}')",
        },
      },
      required: ["oldName", "newName"],
    },
    handler: async (args) => {
      try {
        const oldName = String(args.oldName);
        const newName = String(args.newName);
        const path = args.path ? resolve(String(args.path)) : process.cwd();
        const filePattern = String(args.filePattern || "**/*.{ts,js,tsx,jsx}");

        const files = globSync(filePattern, { cwd: path, nodir: true });
        const regex = new RegExp(`\\b${oldName}\\b`, "g");
        let filesModified = 0;

        for (const file of files.slice(0, 100)) {
          const filePath = join(path, file);
          const content = await readFile(filePath, "utf-8");

          if (regex.test(content)) {
            const newContent = content.replace(regex, newName);
            await writeFile(filePath, newContent, "utf-8");
            filesModified++;
          }
          regex.lastIndex = 0;
        }

        return {
          content: [{
            type: "text",
            text: `Renamed "${oldName}" to "${newName}" in ${filesModified} files`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error renaming symbol: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
];
