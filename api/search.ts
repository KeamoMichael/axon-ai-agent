import type { VercelRequest, VercelResponse } from '@vercel/node';

// Tavily Search API endpoint
// Get your API key at: https://tavily.com/

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { query } = req.query;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

    if (!TAVILY_API_KEY) {
        console.error('TAVILY_API_KEY not configured');
        // Return mock data if API key not configured (for development)
        return res.status(200).json({
            query,
            results: [
                {
                    title: `Search results for: ${query}`,
                    url: 'https://example.com',
                    content: `Found relevant information about "${query}". This is simulated data - configure TAVILY_API_KEY for real results.`,
                    score: 0.9
                }
            ],
            answer: `Based on available information about "${query}"...`
        });
    }

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: query,
                search_depth: 'basic',
                include_answer: true,
                include_raw_content: false,
                max_results: 5,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Tavily API error:', errorText);
            throw new Error(`Tavily API error: ${response.status}`);
        }

        const data = await response.json();

        return res.status(200).json({
            query,
            answer: data.answer || null,
            results: data.results?.map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content,
                score: r.score
            })) || []
        });

    } catch (error: any) {
        console.error('Search error:', error);
        return res.status(500).json({
            error: 'Search failed',
            message: error.message
        });
    }
}
