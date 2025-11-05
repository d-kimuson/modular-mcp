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

// Session state
interface SessionState {
  currentProject?: string;
  mode: "default" | "focus" | "explore";
  onboardingPerformed: boolean;
  config: Record<string, unknown>;
}

const sessionState: SessionState = {
  mode: "default",
  onboardingPerformed: false,
  config: {},
};

export const sessionTools: Tool[] = [
  {
    name: "mcp__serena__activate_project",
    description: "Activate a project directory for the current session.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the project directory",
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      try {
        const path = String(args.path);
        sessionState.currentProject = path;

        return {
          content: [{
            type: "text",
            text: `Project activated: ${path}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error activating project: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__switch_modes",
    description: "Switch between different operational modes (default, focus, explore).",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["default", "focus", "explore"],
          description: "Mode to switch to",
        },
      },
      required: ["mode"],
    },
    handler: async (args) => {
      try {
        const mode = String(args.mode) as SessionState["mode"];

        if (!["default", "focus", "explore"].includes(mode)) {
          return {
            content: [{
              type: "text",
              text: `Invalid mode: ${mode}. Valid modes: default, focus, explore`,
            }],
            isError: true,
          };
        }

        sessionState.mode = mode;

        const modeDescriptions = {
          default: "Standard mode with all features enabled",
          focus: "Focused mode for concentrated work on specific tasks",
          explore: "Exploratory mode for understanding the codebase",
        };

        return {
          content: [{
            type: "text",
            text: `Switched to ${mode} mode: ${modeDescriptions[mode]}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error switching modes: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__get_current_config",
    description: "Get the current session configuration.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      try {
        const config = {
          currentProject: sessionState.currentProject || "None",
          mode: sessionState.mode,
          onboardingPerformed: sessionState.onboardingPerformed,
          config: sessionState.config,
        };

        return {
          content: [{
            type: "text",
            text: `Current configuration:\n\n${JSON.stringify(config, null, 2)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting config: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__onboarding",
    description: "Perform initial onboarding for the session.",
    inputSchema: {
      type: "object",
      properties: {
        preferences: {
          type: "object",
          description: "User preferences for the session",
        },
      },
    },
    handler: async (args) => {
      try {
        sessionState.onboardingPerformed = true;
        if (args.preferences) {
          sessionState.config = { ...sessionState.config, ...args.preferences as object };
        }

        return {
          content: [{
            type: "text",
            text: `Onboarding completed. Session is ready.\n\nWelcome to Serena MCP! You can now:\n- Use fs tools to read/write files\n- Use code tools to navigate and modify code\n- Use memory tools to store information\n- Use session tools to manage your session\n- Use meta tools for planning and reflection`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error during onboarding: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__check_onboarding_performed",
    description: "Check if onboarding has been performed for this session.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      try {
        return {
          content: [{
            type: "text",
            text: `Onboarding performed: ${sessionState.onboardingPerformed}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error checking onboarding: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
  {
    name: "mcp__serena__prepare_for_new_conversation",
    description: "Prepare the session for a new conversation (reset certain state).",
    inputSchema: {
      type: "object",
      properties: {
        keepProject: {
          type: "boolean",
          description: "Whether to keep the current project activated",
        },
      },
    },
    handler: async (args) => {
      try {
        const keepProject = Boolean(args.keepProject);

        if (!keepProject) {
          sessionState.currentProject = undefined;
        }

        // Note: We don't reset onboarding or mode, as those typically persist

        return {
          content: [{
            type: "text",
            text: `Session prepared for new conversation. ${keepProject ? "Project preserved." : "Project cleared."}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error preparing for new conversation: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  },
];
