
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
  description: "Execute PYTHON CODE in a real E2B sandbox. This runs actual Python code and returns real output. Use this to create files, analyze data, or run Python scripts. Write Python code directly, NOT shell commands.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: { type: Type.STRING, description: "PYTHON CODE to execute. Example: print('hello') OR with open('file.txt', 'w') as f: f.write('data')" },
      reason: { type: Type.STRING, description: "Why you are running this code" }
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

## YOUR COMPUTER ENVIRONMENT
You have access to a REAL Linux computer via E2B Code Sandbox:
- **Real Python execution**: Python code runs in an actual Linux VM
- **Real file system**: Files you create are stored on disk in /home/user/
- **Real file downloads**: Users can download any file you create
- **Internet access**: Install packages with pip, download data, etc.

## HOW TO CREATE FILES (CRITICAL!)
To create ANY file, use execute_terminal with PYTHON CODE:

**Example 1 - Create hello.py:**
\`\`\`python
with open('/home/user/hello.py', 'w') as f:
    f.write('print("Hello, World!")')
\`\`\`

**Example 2 - Create data.csv:**
\`\`\`python
import csv
with open('/home/user/data.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Name', 'Age'])
    writer.writerow(['John', '30'])
\`\`\`

**Example 3 - Create index.html:**
\`\`\`python
html = """<!DOCTYPE html>
<html><body><h1>Hello!</h1></body></html>"""
with open('/home/user/index.html', 'w') as f:
    f.write(html)
\`\`\`

CRITICAL RULES:
1. ALWAYS write files to /home/user/ directory
2. ALWAYS use Python code with execute_terminal (NOT shell commands!)
3. NEVER say "I cannot create files" or "I cannot send files" - FILES ARE AUTOMATICALLY DOWNLOADABLE!
4. NEVER just show code in markdown - EXECUTE it with execute_terminal
5. When you create a file, it AUTOMATICALLY appears as a download button in chat - DO NOT tell user to use curl/wget!

## WHEN TO USE TOOLS vs JUST RESPOND

**JUST RESPOND NORMALLY (no tools needed) for:**
- Greetings: "hi", "hello", "hey", "good morning"
- Simple questions: "how are you", "what can you do"
- Casual conversation
- Clarifying questions about what the user wants

**USE TOOLS AND CREATE PLANS for ACTUAL TASKS like:**
- "Create a Python file..."
- "Search for information about..."
- "Build me a website..."
- "Write code that..."
- "Research about..."
- "Make a CSV with..."

## EXECUTION FLOW (ONLY for real tasks, NOT greetings)

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
