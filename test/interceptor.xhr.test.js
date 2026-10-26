// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import datadogRumInterceptor from '../src/index.js';
import { REDACTED_VALUE } from '../src/utils/random.js';
import { startServer } from './helpers/server.js';

let server;
let dri;

beforeAll(async () => {
    server = await startServer();
});

afterAll(async () => {
    await server.close();
});

afterEach(() => {
    dri?.stop();
    dri = undefined;
    vi.useRealTimers();
});

function sendXhr(method, url, { headers = {}, body = null } = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
        xhr.onload = () => resolve(xhr);
        xhr.onerror = () => reject(new Error('XHR failed'));
        xhr.send(body);
    });
}

describe('XHR interception', () => {
    it('matches payloads by fingerprint and redacts sensitive headers', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(1_700_000_005_000); // middle of a 10s fingerprint window

        dri = datadogRumInterceptor.init();
        const url = `${server.baseUrl}/xhr`;
        const xhr = await sendXhr('POST', url, {
            headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
            body: JSON.stringify({ via: 'xhr' }),
        });
        expect(xhr.status).toBe(200);

        let payload = null;
        await vi.waitFor(() => {
            payload = dri.getPayload({
                event: { resource: { type: 'xhr', method: 'POST', url, status_code: 200 }, date: Date.now() },
                context: { xhr },
            });
            expect(payload).not.toBeNull();
        });

        expect(payload.request).toMatchObject({ method: 'POST', url });
        expect(payload.request.headers.authorization).toBe(REDACTED_VALUE);
        expect(payload.response).toMatchObject({ status: 200, body: { ok: true, method: 'POST', received: '{"via":"xhr"}' } });
    });
});
