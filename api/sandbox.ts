import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Sandbox } from '@e2b/code-interpreter';

// E2B Code Sandbox API endpoint
// Get your API key at: https://e2b.dev/
// Set E2B_API_KEY environment variable in Vercel

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

    const { action, code } = req.body;

    // E2B reads API key from E2B_API_KEY environment variable automatically
    const E2B_API_KEY = process.env.E2B_API_KEY;

    if (!E2B_API_KEY) {
        console.error('E2B_API_KEY not configured');
        return res.status(200).json({
            success: false,
            output: 'E2B_API_KEY not configured. Please add it to Vercel environment variables.',
            error: 'API key missing'
        });
    }

    let sandbox: Sandbox | null = null;

    try {
        console.log('[E2B] Creating sandbox...');

        // Create a new sandbox session (E2B reads API key from env automatically)
        sandbox = await Sandbox.create();
        console.log('[E2B] Sandbox created successfully');

        if (action === 'execute') {
            console.log('[E2B] Executing code:', code);

            // Run Python code using runCode method
            const execution = await sandbox.runCode(code);

            console.log('[E2B] Execution result:', execution.logs);

            // Get output from logs
            const stdout = execution.logs.stdout.join('\n');
            const stderr = execution.logs.stderr.join('\n');
            const output = stdout || stderr || execution.text || '';

            // Check for errors
            if (execution.error) {
                console.error('[E2B] Execution error:', execution.error);
                return res.status(200).json({
                    success: false,
                    output: stderr,
                    error: execution.error.name + ': ' + execution.error.value,
                });
            }

            // List files in home directory
            let files: any[] = [];
            try {
                const fileList = await sandbox.files.list('/home/user');
                files = fileList.map((file: any) => ({
                    name: file.name,
                    path: file.path,
                    type: file.type
                }));
                console.log('[E2B] Files:', files);
            } catch (e) {
                console.warn('[E2B] Could not list files:', e);
            }

            return res.status(200).json({
                success: true,
                output,
                files,
            });
        }

        if (action === 'download') {
            const { filepath } = req.body;
            const content = await sandbox.files.read(filepath);
            const filename = filepath.split('/').pop();

            return res.status(200).json({
                success: true,
                content: content.toString(),
                filename
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

        return res.status(400).json({ error: 'Invalid action. Use: execute, download, or list_files' });

    } catch (error: any) {
        console.error('[E2B] Sandbox error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Sandbox execution failed'
        });
    } finally {
        // Always close sandbox
        if (sandbox) {
            console.log('[E2B] Closing sandbox...');
            await sandbox.kill();
        }
    }
}
