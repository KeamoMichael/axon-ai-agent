// Express server for Render.com deployment
// This wraps the sandbox API for use outside Vercel

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sandbox } from '@e2b/code-interpreter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from dist folder (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sandbox API endpoint
app.post('/api/sandbox', async (req, res) => {
    let action = '';
    let code = '';
    let filepath = '';
    let content = '';
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

    const E2B_API_KEY = process.env.E2B_API_KEY;

    if (!E2B_API_KEY) {
        console.error('[E2B] E2B_API_KEY not configured');
        return res.status(200).json({
            success: false,
            output: 'E2B_API_KEY not configured. Please add it to environment variables.',
            error: 'API key missing',
            files: []
        });
    }

    let sandbox: Sandbox | null = null;

    try {
        console.log('[E2B] Creating sandbox...');

        sandbox = await Sandbox.create({
            timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
            metadata: {
                sessionId: metadata?.sessionId || 'anonymous',
                timestamp: new Date().toISOString(),
                ...metadata
            }
        });
        console.log('[E2B] Sandbox created successfully!');

        // Execute Python code
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

            const execution = await sandbox.runCode(code);
            const stdout = execution.logs?.stdout?.join('\n') || '';
            const stderr = execution.logs?.stderr?.join('\n') || '';
            const output = stdout || execution.text || '';

            if (execution.error) {
                return res.status(200).json({
                    success: false,
                    output: stderr || stdout,
                    error: `${execution.error.name}: ${execution.error.value}`,
                    files: []
                });
            }

            // Detect files from code
            let files: any[] = [];
            const fileMatches = code.match(/open\s*\(\s*['"]([^'"]+)['"]/g);
            if (fileMatches) {
                for (const match of fileMatches) {
                    const pathMatch = match.match(/['"]([^'"]+)['"]/);
                    if (pathMatch) {
                        const filePath = pathMatch[1];
                        if (code.includes(`open('${filePath}', 'w')`) ||
                            code.includes(`open("${filePath}", "w")`)) {
                            files.push({
                                name: filePath.split('/').pop() || '',
                                path: filePath,
                                type: 'file'
                            });
                        }
                    }
                }
            }

            return res.status(200).json({
                success: true,
                output,
                files,
            });
        }

        // Run shell command
        if (action === 'command') {
            const result = await sandbox.commands.run(code);
            return res.status(200).json({
                success: result.exitCode === 0,
                output: result.stdout || result.stderr || 'Command executed',
                exitCode: result.exitCode,
                files: []
            });
        }

        // Read file
        if (action === 'read_file' || action === 'download') {
            const fileContent = await sandbox.files.read(filepath);
            return res.status(200).json({
                success: true,
                content: String(fileContent),
                filename: filepath.split('/').pop(),
                files: []
            });
        }

        return res.status(200).json({
            success: false,
            error: 'Invalid action',
            files: []
        });

    } catch (error: any) {
        console.error('[E2B] Sandbox error:', error.message);
        return res.status(200).json({
            success: false,
            output: '',
            error: error.message || 'Sandbox execution failed',
            files: []
        });
    } finally {
        if (sandbox) {
            try {
                await sandbox.kill();
            } catch (e) {
                console.error('[E2B] Error closing sandbox:', e);
            }
        }
    }
});

// SPA catch-all route - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[Server] Axon AI running on port ${PORT}`);
    console.log(`[Server] Frontend: http://localhost:${PORT}`);
    console.log(`[Server] Health: http://localhost:${PORT}/health`);
    console.log(`[Server] API: http://localhost:${PORT}/api/sandbox`);
});
