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

export const metaTools: Tool[] = [
  {
    name: "mcp__serena__think_about_collected_information",
    description: "Reflect on and organize the information collected so far. Use this to synthesize findings and identify patterns.",
    inputSchema: {
      type: "object",
      properties: {
        context: {
          type: "string",
          description: "Current context or information to reflect on",
        },
        question: {
          type: "string",
          description: "Specific question or focus for reflection",
        },
      },
      required: ["context"],
    },
    handler: async (args) => {
      try {
        const context = String(args.context);
        const question = args.question ? String(args.question) : undefined;

        const prompt = question
          ? `Reflecting on the collected information with focus on: "${question}"\n\nContext:\n${context}\n\nConsider:\n- What patterns emerge?\n- What's missing?\n- What are the key insights?\n- What should be investigated further?`
          : `Reflecting on the collected information:\n\n${context}\n\nConsider:\n- What have we learned?\n- How does this information connect?\n- What implications does this have?\n- What questions remain?`;

        return {
          content: [{
            type: "text",
            text: prompt,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error reflecting on information: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__think_about_task_adherence",
    description: "Evaluate whether the current approach aligns with the task requirements.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The original task or goal",
        },
        currentApproach: {
          type: "string",
          description: "Description of the current approach or progress",
        },
      },
      required: ["task", "currentApproach"],
    },
    handler: async (args) => {
      try {
        const task = String(args.task);
        const currentApproach = String(args.currentApproach);

        const prompt = `Task Adherence Check:\n\nOriginal Task:\n${task}\n\nCurrent Approach:\n${currentApproach}\n\nEvaluate:\n- Are we addressing the core requirements?\n- Have we deviated from the goal?\n- What adjustments might be needed?\n- Are there any assumptions that should be validated?`;

        return {
          content: [{
            type: "text",
            text: prompt,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error checking task adherence: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__think_about_whether_you_are_done",
    description: "Evaluate whether the task is complete and what remaining work exists.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task or goal to evaluate",
        },
        completedWork: {
          type: "string",
          description: "Description of work completed so far",
        },
      },
      required: ["task", "completedWork"],
    },
    handler: async (args) => {
      try {
        const task = String(args.task);
        const completedWork = String(args.completedWork);

        const prompt = `Completion Assessment:\n\nTask:\n${task}\n\nCompleted Work:\n${completedWork}\n\nEvaluate:\n- Have all requirements been met?\n- What testing or validation is needed?\n- Are there edge cases to consider?\n- What documentation or cleanup remains?\n- Can this be considered complete, or what's still needed?`;

        return {
          content: [{
            type: "text",
            text: prompt,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error evaluating completion: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__initial_instructions",
    description: "Get initial instructions and guidelines for using Serena MCP effectively.",
    inputSchema: {
      type: "object",
      properties: {
        taskType: {
          type: "string",
          description: "Type of task (e.g., 'debug', 'implement', 'refactor', 'explore')",
        },
      },
    },
    handler: async (args) => {
      try {
        const taskType = args.taskType ? String(args.taskType) : "general";

        const generalInstructions = `Serena MCP - Initial Instructions

Available Tool Categories:
1. **fs**: File system operations (read, write, search, replace)
2. **code**: Code navigation and manipulation (find symbols, refactor)
3. **memory**: Session memory storage (store/retrieve information)
4. **session**: Session management (activate project, switch modes)
5. **meta**: Metacognitive tools (reflection, planning, evaluation)

Best Practices:
- Start by activating your project with mcp__serena__activate_project
- Use memory tools to track important findings across the conversation
- Use meta tools regularly to reflect on progress and ensure task adherence
- For large files, use range parameters in read_file to avoid O(n) operations
- Test regular expressions carefully to avoid backtracking issues

Workflow Recommendations:
1. Understand: Use fs and code tools to explore the codebase
2. Plan: Use meta tools to organize your approach
3. Execute: Use fs and code tools to make changes
4. Verify: Test your changes and use meta tools to evaluate completeness
5. Document: Store key learnings in memory for future reference`;

        const taskSpecificGuidance: Record<string, string> = {
          debug: "\n\nDebug Workflow:\n- Use search_for_pattern to find error-related code\n- Use find_symbol to locate relevant functions\n- Use memory to track hypotheses and findings\n- Use meta tools to evaluate whether root cause is identified",
          implement: "\n\nImplementation Workflow:\n- Use get_symbols_overview to understand existing structure\n- Use meta tools to plan the implementation approach\n- Use code insertion tools to add new functionality\n- Store implementation decisions in memory",
          refactor: "\n\nRefactoring Workflow:\n- Use find_referencing_symbols to understand impact\n- Use meta tools to ensure changes maintain functionality\n- Use rename_symbol for consistent naming updates\n- Document refactoring rationale in memory",
          explore: "\n\nExploration Workflow:\n- Start with get_symbols_overview for high-level structure\n- Use find_symbol to dive into specific areas\n- Use memory to build a mental model of the codebase\n- Use meta reflection tools to synthesize findings",
        };

        const guidance = taskSpecificGuidance[taskType] || "";

        return {
          content: [{
            type: "text",
            text: generalInstructions + guidance,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting initial instructions: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
];
