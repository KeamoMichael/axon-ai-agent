import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Sandbox } from '@e2b/code-interpreter';

// E2B Code Sandbox API endpoint
// Reference: https://e2b.dev/docs
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

    const { action, code, filepath, content, metadata } = req.body;

    // E2B reads API key from E2B_API_KEY environment variable automatically
    const E2B_API_KEY = process.env.E2B_API_KEY;

    if (!E2B_API_KEY) {
        console.error('[E2B] E2B_API_KEY not configured');
        return res.status(200).json({
            success: false,
            output: 'E2B_API_KEY not configured. Please add it to Vercel environment variables.',
            error: 'API key missing'
        });
    }

    let sandbox: Sandbox | null = null;

    try {
        console.log('[E2B] Creating sandbox...');

        // Create a new sandbox session with 15 minute timeout and metadata for tracking
        // E2B reads API key from env automatically
        sandbox = await Sandbox.create({
            timeoutMs: 15 * 60 * 1000,  // 15 minutes for complex agentic tasks
            metadata: metadata || {
                sessionId: 'anonymous',
                timestamp: new Date().toISOString()
            }
        });
        console.log('[E2B] Sandbox created successfully (15 min timeout)', metadata);

        // Action: Execute Python code
        if (action === 'execute') {
            console.log('[E2B] Executing Python code:', code?.substring(0, 100));

            // Run Python code using runCode method
            const execution = await sandbox.runCode(code);

            // Get output from logs
            const stdout = execution.logs?.stdout?.join('\n') || '';
            const stderr = execution.logs?.stderr?.join('\n') || '';
            const output = stdout || execution.text || '';

            console.log('[E2B] Execution stdout:', stdout);
            console.log('[E2B] Execution stderr:', stderr);

            // Check for errors
            if (execution.error) {
                console.error('[E2B] Execution error:', execution.error);
                return res.status(200).json({
                    success: false,
                    output: stderr || stdout,
                    error: `${execution.error.name}: ${execution.error.value}`,
                });
            }

            // List files in home directory
            let files: any[] = [];
            try {
                const fileList = await sandbox.files.list('/home/user');
                files = fileList.map((file: any) => ({
                    name: file.name,
                    path: `/home/user/${file.name}`,
                    type: file.type || 'file'
                }));
                console.log('[E2B] Files in sandbox:', files);
            } catch (e) {
                console.warn('[E2B] Could not list files:', e);
            }

            return res.status(200).json({
                success: true,
                output,
                files,
            });
        }

        // Action: Run shell command  
        if (action === 'command') {
            console.log('[E2B] Running shell command:', code);

            // Use commands.run() for shell commands
            const result = await sandbox.commands.run(code);
            const output = result.stdout || result.stderr || 'Command executed';

            console.log('[E2B] Command stdout:', result.stdout);
            console.log('[E2B] Command stderr:', result.stderr);
            console.log('[E2B] Exit code:', result.exitCode);

            return res.status(200).json({
                success: result.exitCode === 0,
                output,
                exitCode: result.exitCode,
                error: result.exitCode !== 0 ? result.stderr : null,
            });
        }

        // Action: Write file to sandbox
        if (action === 'write_file') {
            console.log('[E2B] Writing file:', filepath);

            await sandbox.files.write(filepath, content);

            return res.status(200).json({
                success: true,
                message: `File written to ${filepath}`
            });
        }

        // Action: Read file from sandbox
        if (action === 'read_file' || action === 'download') {
            console.log('[E2B] Reading file:', filepath);

            const fileContent = await sandbox.files.read(filepath);
            const filename = filepath.split('/').pop();

            return res.status(200).json({
                success: true,
                content: String(fileContent),
                filename
            });
        }

        // Action: List files in directory
        if (action === 'list_files') {
            const dir = filepath || '/home/user';
            console.log('[E2B] Listing files in:', dir);

            const files = await sandbox.files.list(dir);

            return res.status(200).json({
                success: true,
                files: files.map((f: any) => ({
                    name: f.name,
                    path: `${dir}/${f.name}`,
                    type: f.type || 'file'
                }))
            });
        }

        return res.status(400).json({
            error: 'Invalid action. Use: execute (Python), command (shell), write_file, read_file, list_files'
        });

    } catch (error: any) {
        console.error('[E2B] Sandbox error:', error.message);
        console.error('[E2B] Full error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Sandbox execution failed'
        });
    } finally {
        // Always close sandbox (per E2B docs)
        if (sandbox) {
            console.log('[E2B] Closing sandbox...');
            await sandbox.kill();
        }
    }
}
