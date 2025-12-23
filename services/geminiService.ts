
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";

// Fix: Correct initialization using named parameter and process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const browseUrl: FunctionDeclaration = {
  name: "browse_url",
  parameters: {
    type: Type.OBJECT,
    description: "Navigates to a specific URL and returns page content.",
    properties: {
      url: { type: Type.STRING, description: "The URL to visit" },
      reason: { type: Type.STRING, description: "Why we are visiting this URL" }
    },
    required: ["url"]
  }
};

const executeTerminal: FunctionDeclaration = {
  name: "execute_terminal",
  parameters: {
    type: Type.OBJECT,
    description: "Executes a command in the terminal for file operations or code execution.",
    properties: {
      command: { type: Type.STRING, description: "The shell command to run" }
    },
    required: ["command"]
  }
};

const createPlan: FunctionDeclaration = {
  name: "create_plan",
  parameters: {
    type: Type.OBJECT,
    description: "Defines the multi-step plan the agent will follow.",
    properties: {
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING }
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
  parameters: {
    type: Type.OBJECT,
    description: "Updates the current status of the agent's work.",
    properties: {
      message: { type: Type.STRING, description: "A status message for the user" },
      activeStepId: { type: Type.STRING, description: "ID of the current plan step being executed" }
    },
    required: ["message"]
  }
};

const systemInstruction = `
You are Axon, the world's first truly autonomous AI agent. 
You solve complex tasks by browsing the web, executing code, and creating structured plans.
Your interface is light, modern, and high-end. 

STRICT WORKFLOW:
1. Greet the user and immediately use 'create_plan' to outline how you'll solve their request.
2. Use 'update_status' to keep the user informed of which step you are on.
3. Use 'googleSearch' for general knowledge or 'browse_url' for specific sites.
4. If code is needed, use 'execute_terminal'.
5. Always synthesize findings into a clean, professional final response.

Be concise. Don't explain your tools to the user; just use them.
`;

export class GeminiAgent {
  private chat;

  constructor() {
    this.chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction,
        tools: [
          { functionDeclarations: [browseUrl, executeTerminal, createPlan, updateStatus] },
          { googleSearch: {} }
        ]
      }
    });
  }

  async sendMessage(message: string): Promise<GenerateContentResponse> {
    return await this.chat.sendMessage({ message });
  }

  async sendToolResponse(callId: string, name: string, response: any): Promise<GenerateContentResponse> {
    const result = JSON.stringify(response);
    return await this.chat.sendMessage({ message: `TOOL_RESULT [${name}]: ${result}` });
  }
}
