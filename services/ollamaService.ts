// Ollama Local AI Service
// Connects to locally running Ollama for fast, free AI responses

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OllamaResponse {
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

const OLLAMA_BASE_URL = 'http://localhost:11434';

// Model mapping
export const OLLAMA_MODELS = {
    'axon-lite': 'llama3.2:3b',      // Fast model
    'axon-pro': 'qwen2.5:7b',        // Smart reasoning model  
    'fallback': 'neural-chat:latest' // Fallback if others not installed
};

export class OllamaAgent {
    private model: string;
    private conversationHistory: OllamaMessage[] = [];
    private systemPrompt: string;

    constructor(modelKey: 'axon-lite' | 'axon-pro' = 'axon-lite') {
        this.model = OLLAMA_MODELS[modelKey] || OLLAMA_MODELS.fallback;
        this.systemPrompt = `You are Axon, an autonomous AI agent developed by Axon.

CRITICAL IDENTITY: You are NOT Google or OpenAI. You are Axon, created by Axon.

## YOUR CAPABILITIES
- You can create plans and execute them step by step
- You can search the web for information
- You can write and execute Python code
- You can create files for users to download

## RESPONSE STYLE
- Be concise and helpful
- When given a task, create a brief plan first
- Execute each step and report progress
- For file creation, use the execute_terminal tool with Python code

## TOOLS AVAILABLE
You have access to these function calls:
- create_plan: Create a step-by-step plan
- update_status: Update step status (active/completed)
- web_search: Search for information online
- execute_terminal: Run Python code to create files

Be conversational for greetings, but take action for real tasks.`;
    }

    setModel(modelKey: 'axon-lite' | 'axon-pro') {
        this.model = OLLAMA_MODELS[modelKey] || OLLAMA_MODELS.fallback;
        console.log(`[Ollama] Switched to model: ${this.model}`);
    }

    async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async chat(userMessage: string): Promise<string> {
        this.conversationHistory.push({ role: 'user', content: userMessage });

        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        ...this.conversationHistory
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.statusText}`);
            }

            const data: OllamaResponse = await response.json();
            const assistantMessage = data.message.content;

            this.conversationHistory.push({ role: 'assistant', content: assistantMessage });

            return assistantMessage;
        } catch (error: any) {
            console.error('[Ollama] Chat error:', error);
            throw error;
        }
    }

    async *streamChat(userMessage: string): AsyncGenerator<string> {
        this.conversationHistory.push({ role: 'user', content: userMessage });

        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        ...this.conversationHistory
                    ],
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            fullResponse += data.message.content;
                            yield data.message.content;
                        }
                    } catch {
                        // Skip invalid JSON lines
                    }
                }
            }

            this.conversationHistory.push({ role: 'assistant', content: fullResponse });
        } catch (error: any) {
            console.error('[Ollama] Stream error:', error);
            throw error;
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }
}

// Helper to check if Ollama is available
export async function isOllamaAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Get list of installed models
export async function getInstalledModels(): Promise<string[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    } catch {
        return [];
    }
}
