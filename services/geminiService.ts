
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
  description: "Creates a multi-step execution plan for the task. Call this first to outline your approach.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.ARRAY,
        description: "Array of plan steps",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "Unique step ID like step_1, step_2" },
            title: { type: Type.STRING, description: "Short title for the step" },
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
  description: "Updates the current status and active step. Call this when moving between steps.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: { type: Type.STRING, description: "Current status message to display" },
      activeStepId: { type: Type.STRING, description: "ID of the step currently being executed" },
      toolUsed: { type: Type.STRING, description: "Tool being used: 'search', 'browse', 'terminal', 'thinking'" }
    },
    required: ["message"]
  }
};

const browseUrl: FunctionDeclaration = {
  name: "browse_url",
  description: "Navigates to a URL and extracts content. Use for specific websites.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "The URL to visit" },
      reason: { type: Type.STRING, description: "Why visiting this URL" }
    },
    required: ["url"]
  }
};

const executeTerminal: FunctionDeclaration = {
  name: "execute_terminal",
  description: "Executes a terminal command for code or file operations.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: { type: Type.STRING, description: "The shell command to run" }
    },
    required: ["command"]
  }
};

const systemInstruction = `You are Axon, an intelligent AI assistant that helps users with research and complex tasks.

When responding to research requests:
1. Use your search capabilities to find current information
2. Synthesize the findings into clear, well-formatted responses
3. Use bullet points and bold text for key insights
4. Cite sources when providing factual information

For other questions, provide helpful, accurate responses.

Always format your responses using:
- **Bold** for key terms and important points
- Numbered lists for steps or ranked items
- Bullet points for features or characteristics
- Clear paragraph breaks for readability`;

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
