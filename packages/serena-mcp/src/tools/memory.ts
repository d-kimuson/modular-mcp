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

// In-memory storage for the session
const memoryStore = new Map<string, { value: string; timestamp: number }>();

export const memoryTools: Tool[] = [
  {
    name: "mcp__serena__write_memory",
    description: "Store information in memory for later retrieval during the conversation.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Unique key to identify this memory",
        },
        value: {
          type: "string",
          description: "Content to store",
        },
      },
      required: ["key", "value"],
    },
    handler: async (args) => {
      try {
        const key = String(args.key);
        const value = String(args.value);

        memoryStore.set(key, {
          value,
          timestamp: Date.now(),
        });

        return {
          content: [{
            type: "text",
            text: `Memory stored with key: "${key}"`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error writing memory: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__read_memory",
    description: "Retrieve information from memory using its key.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key of the memory to retrieve",
        },
      },
      required: ["key"],
    },
    handler: async (args) => {
      try {
        const key = String(args.key);
        const memory = memoryStore.get(key);

        if (!memory) {
          return {
            content: [{
              type: "text",
              text: `No memory found with key: "${key}"`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text",
            text: `Memory "${key}":\n\n${memory.value}\n\n(Stored: ${new Date(memory.timestamp).toISOString()})`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error reading memory: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__list_memories",
    description: "List all stored memories with their keys.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      try {
        if (memoryStore.size === 0) {
          return {
            content: [{
              type: "text",
              text: "No memories stored",
            }],
          };
        }

        const memories = Array.from(memoryStore.entries()).map(([key, data]) => {
          const preview = data.value.length > 50
            ? `${data.value.substring(0, 50)}...`
            : data.value;
          return `- ${key}: ${preview} (${new Date(data.timestamp).toISOString()})`;
        });

        return {
          content: [{
            type: "text",
            text: `Stored memories (${memoryStore.size}):\n\n${memories.join("\n")}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing memories: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__delete_memory",
    description: "Delete a memory by its key.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key of the memory to delete",
        },
      },
      required: ["key"],
    },
    handler: async (args) => {
      try {
        const key = String(args.key);
        const existed = memoryStore.delete(key);

        if (!existed) {
          return {
            content: [{
              type: "text",
              text: `No memory found with key: "${key}"`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text",
            text: `Memory "${key}" deleted`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error deleting memory: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
];
