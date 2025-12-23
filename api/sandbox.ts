import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CodeInterpreter } from '@e2b/code-interpreter';

// E2B Code Sandbox API endpoint
// Get your API key at: https://e2b.dev/

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, code, language = 'python' } = req.body;

    const E2B_API_KEY = process.env.E2B_API_KEY;

    if (!E2B_API_KEY) {
        console.error('E2B_API_KEY not configured');
        // Return mock response if API key not configured
        return res.status(200).json({
            success: false,
            output: 'E2B_API_KEY not configured. Please add it to Vercel environment variables.',
            error: 'API key missing'
        });
    }

    try {
        let sandbox;

        try {
            // Create a new sandbox session
            sandbox = await CodeInterpreter.create({
                apiKey: E2B_API_KEY,
                timeout: 60000, // 60 seconds
            });

            if (action === 'execute') {
                // Execute code in sandbox
                const execution = await sandbox.notebook.execCell(code, {
                    onStderr: (msg) => console.error('[E2B stderr]:', msg),
                    onStdout: (msg) => console.log('[E2B stdout]:', msg),
                });

                // Get all files in the sandbox
                const files = await sandbox.files.list('/home/user');

                const fileList = files.map((file: any) => ({
                    name: file.name,
                    path: file.path,
                    type: file.type
                }));

                return res.status(200).json({
                    success: true,
                    output: execution.text || '',
                    error: execution.error ? execution.error.value : null,
                    files: fileList,
                    logs: execution.logs,
                });
            }

            if (action === 'download') {
                const { filepath } = req.body;

                // Read file from sandbox
                const fileContent = await sandbox.files.read(filepath);

                return res.status(200).json({
                    success: true,
                    content: fileContent,
                    filename: filepath.split('/').pop()
                });
            }

            if (action === 'list_files') {
                const files = await sandbox.files.list('/home/user');

                return res.status(200).json({
                    success: true,
                    files: files.map((f: any) => ({
                        name: f.name,
                        path: f.path,
                        type: f.type
                    }))
                });
            }

            return res.status(400).json({ error: 'Invalid action' });

        } finally {
            // Always close sandbox
            if (sandbox) {
                await sandbox.close();
            }
        }

    } catch (error: any) {
        console.error('E2B Sandbox error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Sandbox execution failed'
        });
    }
}
