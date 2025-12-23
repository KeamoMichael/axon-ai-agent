import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Sandbox } from '@e2b/code-interpreter';

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
        return res.status(200).json({
            success: false,
            output: 'E2B_API_KEY not configured. Please add it to Vercel environment variables.',
            error: 'API key missing'
        });
    }

    let sandbox: Sandbox | null = null;

    try {
        // Create a new sandbox session
        sandbox = await Sandbox.create({
            apiKey: E2B_API_KEY,
        });

        if (action === 'execute') {
            // Determine if this is a shell command or Python code
            const isShellCommand = code.startsWith('echo ') ||
                code.startsWith('cat ') ||
                code.startsWith('ls ') ||
                code.startsWith('cd ') ||
                code.startsWith('mkdir ') ||
                code.startsWith('pip ') ||
                code.startsWith('npm ') ||
                code.includes(' > ') ||
                code.includes(' >> ');

            let output = '';
            let files: any[] = [];

            if (isShellCommand) {
                // Run shell command
                const result = await sandbox.commands.run(code);
                output = result.stdout || result.stderr || 'Command executed';
            } else {
                // Run Python code in notebook
                const execution = await sandbox.runCode(code);
                output = execution.text || '';

                if (execution.error) {
                    return res.status(200).json({
                        success: false,
                        output: '',
                        error: execution.error.value || 'Execution error',
                    });
                }
            }

            // List files in home directory
            try {
                const fileList = await sandbox.files.list('/home/user');
                files = fileList.map((file: any) => ({
                    name: file.name,
                    path: file.path,
                    type: file.type
                }));
            } catch (e) {
                // Ignore file listing errors
            }

            return res.status(200).json({
                success: true,
                output,
                files,
            });
        }

        if (action === 'download') {
            const { filepath } = req.body;
            const fileContent = await sandbox.files.read(filepath);

            return res.status(200).json({
                success: true,
                content: fileContent,
                filename: filepath.split('/').pop()
            });
        }

        if (action === 'write_file') {
            const { filepath, content } = req.body;
            await sandbox.files.write(filepath, content);

            return res.status(200).json({
                success: true,
                message: `File written to ${filepath}`
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

    } catch (error: any) {
        console.error('E2B Sandbox error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Sandbox execution failed'
        });
    } finally {
        // Always close sandbox
        if (sandbox) {
            await sandbox.kill();
        }
    }
}
