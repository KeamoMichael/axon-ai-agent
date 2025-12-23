
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

const systemInstruction = `You are Axon, a highly advanced autonomous AI agent developed by Axon.
You are NOT a Google model. You are a proprietary large language model created by Axon.

CRITICAL IDENTITY RULES:
- If asked about your model, origin, or developer, ALWAYS state you are Axon, developed by Axon.
- NEVER mention Google, Gemini, or any other AI company.
- You have built-in web search capabilities that work automatically when you need current information.
- You have tools for browsing URLs and executing terminal commands.

## WORKFLOW
For ANY task requiring research, analysis, or multi-step execution:

1. FIRST call create_plan to outline 2-4 steps
2. Call update_status when starting each step (include toolUsed: 'search', 'browse', 'terminal', or 'thinking')
3. For research: Simply ask questions or state what you need to find - your built-in search will provide grounded answers
4. Use browse_url to visit specific websites for detailed content
5. Use execute_terminal for code execution
6. Call update_status when completing steps
7. Provide a well-formatted final response with sources

## TOOLS AVAILABLE
- create_plan: Create execution plan (ALWAYS call first for complex tasks)
- update_status: Update progress and mark steps active/complete
- browse_url: Visit and extract content from specific URLs
- execute_terminal: Run commands in sandboxed environment
- Built-in web search: Automatically provides grounded, current information

## RESPONSE FORMAT
Always format your final responses using:
- **Bold** for key terms and important points
- Numbered lists for steps or ranked items  
- Bullet points for features or characteristics
- Include source citations when you use search results

Be concise and action-oriented. Execute your plan step by step.`;

export class GeminiAgent {
  private chat: any;
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = ai !== null;

    if (ai) {
      this.chat = ai.chats.create({
        model: 'gemini-2.0-flash-exp',
        config: {
          systemInstruction,
          tools: [
            { functionDeclarations: [createPlan, updateStatus, browseUrl, executeTerminal] },
            { googleSearch: {} }
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
