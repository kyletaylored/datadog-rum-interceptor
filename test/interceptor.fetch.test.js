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

/**
 * Polls getPayload until the async response handler has stored the data.
 */
async function waitForPayload(beforeSend) {
    let payload = null;
    await vi.waitFor(() => {
        payload = dri.getPayload(beforeSend);
        expect(payload).not.toBeNull();
    });
    return payload;
}

describe('fetch interception', () => {
    it('matches payloads by Datadog trace ID', async () => {
        dri = datadogRumInterceptor.init();
        const url = `${server.baseUrl}/traced`;
        const requestInit = {
            method: 'POST',
            body: JSON.stringify({ hello: 'world' }),
            headers: [['x-datadog-trace-id', 'trace-123'], ['content-type', 'application/json']],
        };
        const response = await fetch(url, requestInit);
        expect(await response.json()).toMatchObject({ ok: true, received: '{"hello":"world"}' });

        const payload = await waitForPayload({
            event: { resource: { type: 'fetch', method: 'POST', url, status_code: 200 }, date: Date.now() },
            context: { requestInit, response },
        });

        expect(payload.request).toMatchObject({ method: 'POST', url });
        expect(payload.request.headers['x-datadog-trace-id']).toBe('trace-123');
        expect(payload.response).toMatchObject({ status: 200, body: { ok: true, method: 'POST', path: '/traced' } });
    });

    it('matches payloads by fingerprint when no trace ID is present', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(1_700_000_005_000); // middle of a 10s fingerprint window

        dri = datadogRumInterceptor.init();
        const url = `${server.baseUrl}/fingerprint`;
        const response = await fetch(url);

        const payload = await waitForPayload({
            event: { resource: { type: 'fetch', method: 'GET', url, status_code: 200 }, date: Date.now() },
            context: { requestInit: {}, response },
        });

        expect(payload.request).toMatchObject({ method: 'GET', url });
        expect(payload.response.body).toMatchObject({ path: '/fingerprint' });
    });

    it('redacts sensitive headers by default', async () => {
        dri = datadogRumInterceptor.init();
        const url = `${server.baseUrl}/secret`;
        const requestInit = { headers: [['x-datadog-trace-id', 'trace-redact'], ['authorization', 'Bearer secret']] };
        const response = await fetch(url, requestInit);

        const payload = await waitForPayload({
            event: { resource: { type: 'fetch', url } },
            context: { requestInit, response },
        });

        expect(payload.request.headers.authorization).toBe(REDACTED_VALUE);
        expect(payload.response.headers['set-cookie']).toBe(REDACTED_VALUE);
        expect(payload.response.headers['x-test-header']).toBe('visible');
    });

    it('keeps headers when redaction is disabled', async () => {
        dri = datadogRumInterceptor.init({ redactHeaders: [] });
        const url = `${server.baseUrl}/no-redact`;
        const requestInit = { headers: [['x-datadog-trace-id', 'trace-keep'], ['authorization', 'Bearer secret']] };
        const response = await fetch(url, requestInit);

        const payload = await waitForPayload({
            event: { resource: { type: 'fetch', url } },
            context: { requestInit, response },
        });

        expect(payload.request.headers.authorization).toBe('Bearer secret');
        expect(payload.response.headers['set-cookie']).toBe('session=secret');
    });

    it('stops intercepting and clears stored data after stop()', async () => {
        dri = datadogRumInterceptor.init();
        const url = `${server.baseUrl}/stopped`;
        const requestInit = { headers: [['x-datadog-trace-id', 'trace-stop']] };
        const beforeSend = { event: { resource: { type: 'fetch', url } }, context: { requestInit } };

        // Data captured before stop() is discarded
        await fetch(url, requestInit);
        await new Promise((resolve) => setTimeout(resolve, 50));
        dri.stop();
        expect(dri.getPayload({ ...beforeSend, context: { ...beforeSend.context, response: new Response() } })).toBeNull();

        // Requests after stop() are not captured
        const response = await fetch(url, requestInit);
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(dri.getPayload({ ...beforeSend, context: { requestInit, response } })).toBeNull();
    });
});

describe('getPayload input handling', () => {
    it.each([
        ['undefined', undefined],
        ['a non-object', 'nope'],
        ['missing event', { context: {} }],
        ['missing context', { event: {} }],
        ['a fetch event without a response (network error)', { event: { resource: { type: 'fetch' } }, context: {} }],
        ['an xhr event without an xhr', { event: { resource: { type: 'xhr' } }, context: {} }],
    ])('returns null for %s', (_, input) => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        dri = datadogRumInterceptor.init();
        expect(() => dri.getPayload(input)).not.toThrow();
        expect(dri.getPayload(input)).toBeNull();
    });
});
