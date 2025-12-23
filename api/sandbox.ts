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

    let action: string = '';
    let code: string = '';
    let filepath: string = '';
    let content: string = '';
    let metadata: any = {};

    try {
        const body = req.body || {};
        action = body.action || '';
        code = body.code || '';
        filepath = body.filepath || '';
        content = body.content || '';
        metadata = body.metadata || {};
    } catch (parseError) {
        console.error('[E2B] Failed to parse request body:', parseError);
        return res.status(200).json({
            success: false,
            output: '',
            error: 'Failed to parse request',
            files: []
        });
    }

    // E2B reads API key from E2B_API_KEY environment variable automatically
    const E2B_API_KEY = process.env.E2B_API_KEY;

    if (!E2B_API_KEY) {
        console.error('[E2B] E2B_API_KEY not configured');
        return res.status(200).json({
            success: false,
            output: 'E2B_API_KEY not configured. Please add it to Vercel environment variables.',
            error: 'API key missing',
            files: []
        });
    }

    let sandbox: Sandbox | null = null;

    try {
        console.log('[E2B] Creating sandbox with 24h timeout...');

        // Create a new sandbox session with 24 HOUR timeout (max allowed) for persistent agentic tasks
        // timeout is in SECONDS per E2B docs
        sandbox = await Sandbox.create({
            timeout: 86400,  // 24 hours in seconds (max allowed by E2B)
            metadata: {
                sessionId: metadata?.sessionId || 'anonymous',
                timestamp: new Date().toISOString(),
                ...metadata
            }
        });
        console.log('[E2B] Sandbox created successfully with 24h timeout');

        // Action: Execute Python code
        if (action === 'execute') {
            console.log('[E2B] Executing Python code:', code?.substring(0, 100));

            if (!code) {
                return res.status(200).json({
                    success: false,
                    output: 'No code provided',
                    error: 'Missing code parameter',
                    files: []
                });
            }

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
                    files: []
                });
            }

            // Detect files created by the code
            let files: any[] = [];

            // Parse code for file paths (e.g., open('/home/user/hello.py', 'w'))
            const fileMatches = code.match(/open\s*\(\s*['"]([^'"]+)['"]/g);
            if (fileMatches) {
                for (const match of fileMatches) {
                    const pathMatch = match.match(/['"]([^'"]+)['"]/);
                    if (pathMatch) {
                        const filePath = pathMatch[1];
                        // Only include if it's a write operation (look for 'w' mode)
                        if (code.includes(`open('${filePath}', 'w')`) ||
                            code.includes(`open("${filePath}", "w")`) ||
                            code.includes(`open('${filePath}', "w")`) ||
                            code.includes(`open("${filePath}", 'w')`)) {
                            const fileName = filePath.split('/').pop() || '';
                            files.push({
                                name: fileName,
                                path: filePath,
                                type: 'file'
                            });
                        }
                    }
                }
            }

            // Also list files from home directory if no explicit paths found
            if (files.length === 0) {
                try {
                    const fileList = await sandbox.files.list('/home/user');
                    // Filter to only include actual files (not system dirs)
                    files = fileList
                        .filter((f: any) => f.type === 'file')
                        .map((file: any) => ({
                            name: file.name,
                            path: `/home/user/${file.name}`,
                            type: 'file'
                        }));
                } catch (listError) {
                    console.warn('[E2B] Could not list files:', listError);
                }
            }

            console.log('[E2B] Files detected:', files);

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
                files: []
            });
        }

        // Action: Write file to sandbox
        if (action === 'write_file') {
            console.log('[E2B] Writing file:', filepath);

            await sandbox.files.write(filepath, content);

            return res.status(200).json({
                success: true,
                message: `File written to ${filepath}`,
                files: [{ name: filepath.split('/').pop(), path: filepath, type: 'file' }]
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
                filename,
                files: []
            });
        }

        // Action: List files in directory
        if (action === 'list_files') {
            const dir = filepath || '/home/user';
            console.log('[E2B] Listing files in:', dir);

            const filesList = await sandbox.files.list(dir);

            return res.status(200).json({
                success: true,
                files: filesList.map((f: any) => ({
                    name: f.name,
                    path: `${dir}/${f.name}`,
                    type: f.type || 'file'
                }))
            });
        }

        return res.status(200).json({
            success: false,
            error: 'Invalid action. Use: execute (Python), command (shell), write_file, read_file, list_files',
            files: []
        });

    } catch (error: any) {
        console.error('[E2B] Sandbox error:', error.message);
        console.error('[E2B] Full error:', error);

        // ALWAYS return valid JSON even on errors
        return res.status(200).json({
            success: false,
            output: '',
            error: error.message || 'Sandbox execution failed',
            files: []
        });
    } finally {
        // Always close sandbox (per E2B docs)
        if (sandbox) {
            console.log('[E2B] Closing sandbox...');
            try {
                await sandbox.kill();
            } catch (killError) {
                console.error('[E2B] Error closing sandbox:', killError);
            }
        }
    }
}
