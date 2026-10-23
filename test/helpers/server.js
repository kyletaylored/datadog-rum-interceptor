import http from 'node:http';

/**
 * Starts a local HTTP server for integration tests.
 * Every response is JSON, CORS-enabled, and sets a cookie so redaction can be verified.
 * @returns {Promise<{ baseUrl: string, close: () => Promise<void> }>}
 */
export async function startServer() {
    const server = http.createServer((req, res) => {
        const corsHeaders = {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-expose-headers': '*',
        };

        if (req.method === 'OPTIONS') {
            res.writeHead(204, corsHeaders);
            res.end();
            return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            res.writeHead(200, {
                ...corsHeaders,
                'content-type': 'application/json',
                'set-cookie': 'session=secret',
                'x-test-header': 'visible',
            });
            res.end(JSON.stringify({ ok: true, method: req.method, path: req.url, received: body || null }));
        });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolve) => server.close(resolve)),
    };
}
