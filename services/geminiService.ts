
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Get API key from environment variables
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

// Initialize AI only if API key is available
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

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
        model: 'gemini-2.0-flash',
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

