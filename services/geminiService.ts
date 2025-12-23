
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";

// Get API key from environment variables
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

// Initialize AI only if API key is available
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// Function declarations for agentic capabilities
const createPlan: FunctionDeclaration = {
  name: "create_plan",
  description: "Creates a multi-step execution plan for the task. Call this FIRST to outline your approach before taking any actions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.ARRAY,
        description: "Array of plan steps to execute",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "Unique step ID like step_1, step_2" },
            title: { type: Type.STRING, description: "Short title describing the step" },
            description: { type: Type.STRING, description: "What this step will accomplish" }
          },
          required: ["id", "title"]
        }
      }
    },
    required: ["steps"]
  }
};

const updateStatus: FunctionDeclaration = {
  name: "update_status",
  description: "Updates the current status and marks a step as active. Call this when starting or completing a step.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: { type: Type.STRING, description: "Current status message to display to the user" },
      activeStepId: { type: Type.STRING, description: "ID of the step currently being executed" },
      toolUsed: { type: Type.STRING, description: "Tool being used: 'search', 'browse', 'terminal', 'thinking'" }
    },
    required: ["message"]
  }
};

const browseUrl: FunctionDeclaration = {
  name: "browse_url",
  description: "Opens a URL in the browser to extract and analyze content from websites. Use for research and data gathering.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "The full URL to visit and extract content from" },
      reason: { type: Type.STRING, description: "Why you are visiting this URL" }
    },
    required: ["url"]
  }
};

const executeTerminal: FunctionDeclaration = {
  name: "execute_terminal",
  description: "Executes a command in a sandboxed terminal environment. Use for code execution, file operations, and system tasks.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: { type: Type.STRING, description: "The shell command to execute" },
      reason: { type: Type.STRING, description: "Why you are running this command" }
    },
    required: ["command"]
  }
};

const webSearch: FunctionDeclaration = {
  name: "web_search",
  description: "Performs a web search to find current information on any topic. Use for research and fact-finding.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The search query" },
      reason: { type: Type.STRING, description: "What information you're looking for" }
    },
    required: ["query"]
  }
};

const systemInstruction = `You are Axon, an autonomous AI agent developed by Axon.

CRITICAL IDENTITY: You are NOT Google. You are Axon, created by Axon.

## CAPABILITIES
You have the following abilities:
- **Create and modify files**: You can generate complete file contents (HTML, CSS, JS, Python, etc.)
- **Execute terminal commands**: You can run commands (simulated in sandbox)
- **Web search**: Find current information using web_search tool
- **Browse websites**: Visit URLs to extract content using browse_url

IMPORTANT: When asked to create files or code:
1. Generate the COMPLETE file content
2. Present it in a code block with proper syntax highlighting
3. DO NOT say "I cannot access files" - you CAN create file contents
4. Users can copy the code using the copy button in code blocks

## MANDATORY EXECUTION FLOW
For ANY research or complex task:

1. Call create_plan with 2-4 steps
2. IMMEDIATELY after planning, call update_status for step 1
3. Execute the appropriate tools (web_search, browse_url, execute_terminal)
4. Mark steps complete as you progress
5. Provide final formatted response

CRITICAL: After creating a plan, IMMEDIATELY start executing. 
DO NOT say "I'm ready to start" - START by calling tools.
DO NOT wait for confirmation - EXECUTE the plan now.

## TOOLS
- create_plan: Create 2-4 step plan (call ONCE at start)
- update_status: Mark steps active/complete (call for EACH step)
- web_search: Search for current information
- browse_url: Visit specific URLs
- execute_terminal: Run commands (use for demonstrations, not actual system changes)

## RESPONSE FORMAT
Present code and files in markdown code blocks:
\`\`\`html
<!DOCTYPE html>
<!-- complete file here -->
\`\`\`

Use:
- **Bold** headers and key terms
- Numbered lists for steps
- Bullet points for features
- Code blocks for ALL file contents

REMEMBER: You can CREATE files and code. Present complete, working code in code blocks for users to copy.`;

export class GeminiAgent {
  private chat: any;
  private isAvailable: boolean;
  private currentModel: string;

  constructor(model: string = 'gemini-2.0-flash-exp') {
    this.isAvailable = ai !== null;
    this.currentModel = model;

    if (ai) {
      this.chat = ai.chats.create({
        model: this.currentModel,
        config: {
          systemInstruction,
          tools: [
            { functionDeclarations: [createPlan, updateStatus, browseUrl, executeTerminal, webSearch] }
          ]
        }
      });
    }
  }

  setModel(model: string) {
    this.currentModel = model;
    if (ai) {
      this.chat = ai.chats.create({
        model: this.currentModel,
        config: {
          systemInstruction,
          tools: [
            { functionDeclarations: [createPlan, updateStatus, browseUrl, executeTerminal, webSearch] }
          ]
        }
      });
    }
  }

  isApiConfigured(): boolean {
    return this.isAvailable;
  }

  async sendMessage(message: string): Promise<GenerateContentResponse> {
    if (!this.isAvailable || !this.chat) {
      throw new Error("API key not configured. Please add GEMINI_API_KEY to your environment variables.");
    }
    return await this.chat.sendMessage({ message });
  }

  async sendToolResponse(callId: string, name: string, response: any): Promise<GenerateContentResponse> {
    if (!this.isAvailable || !this.chat) {
      throw new Error("API key not configured. Please add GEMINI_API_KEY to your environment variables.");
    }
    const result = JSON.stringify(response);
    return await this.chat.sendMessage({ message: `TOOL_RESULT [${name}]: ${result}` });
  }
}
