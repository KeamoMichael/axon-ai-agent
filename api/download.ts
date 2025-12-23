import type { VercelRequest, VercelResponse } from '@vercel/node';

// Download file from E2B sandbox
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Filename required' });
    }

    // For now, return a simple download
    // In production, you'd fetch this from E2B sandbox
    const filepath = `/home/user/${filename}`;

    try {
        // Call sandbox API to read file
        const sandboxUrl = `${process.env.VERCEL_URL || 'http://localhost:5173'}/api/sandbox`;
        const response = await fetch(sandboxUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'read_file',
                filepath
            })
        });

        const data = await response.json();

        if (data.success) {
            // Set download headers
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            return res.status(200).send(data.content);
        } else {
            return res.status(404).json({ error: 'File not found' });
        }
    } catch (error: any) {
        console.error('[Download] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
