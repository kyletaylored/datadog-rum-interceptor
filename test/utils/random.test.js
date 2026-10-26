import { describe, it, expect } from 'vitest';
import {
    getHeaders,
    filterResource,
    simpleHash,
    getTraceId,
    buildDataObject,
    parseBody,
    getXhrHeaders,
    hashJsonObject,
    redactHeaders,
    REDACTED_VALUE,
} from '../../src/utils/random.js';

describe('getHeaders', () => {
    it('converts a Headers instance to a plain object', () => {
        const headers = new Headers({ 'Content-Type': 'application/json', 'X-Foo': 'bar' });
        expect(getHeaders(headers)).toEqual({ 'content-type': 'application/json', 'x-foo': 'bar' });
    });

    it('throws for non-Headers input', () => {
        expect(() => getHeaders({ foo: 'bar' })).toThrow();
    });
});

describe('filterResource', () => {
    it.each([
        'https://browser-intake-datadoghq.com/api/v2/rum',
        'https://browser-intake-us3-datadoghq.com/api/v2/rum',
        'https://browser-intake-us5-datadoghq.com/api/v2/rum',
        'https://browser-intake-ap1-datadoghq.com/api/v2/rum',
        'https://browser-intake-datadoghq.eu/api/v2/rum',
        'https://rum.browser-intake-datadoghq.eu/api/v2/rum',
        'https://browser-intake-ddog-gov.com/api/v2/rum',
        'https://datadoghq.com/',
        'https://APP.DATADOGHQ.COM/',
    ])('filters Datadog URL %s', (url) => {
        expect(filterResource({ url })).toBe(true);
    });

    it.each([
        'https://example.com/api',
        'https://example.com/search?q=datadoghq.com',
        'https://notdatadoghq.com/',
        'https://evil-datadoghq.com/',
        'https://browser-intake-datadoghq.com.evil.example/',
        'https://datadoghq.com.evil.example/',
    ])('does not filter %s', (url) => {
        expect(filterResource({ url })).toBe(false);
    });

    it('does not filter unparseable URLs', () => {
        expect(filterResource({ url: 'not a url' })).toBe(false);
    });
});

describe('redactHeaders', () => {
    it('redacts default sensitive headers case-insensitively', () => {
        const result = redactHeaders({ Authorization: 'Bearer abc', cookie: 'a=b', 'content-type': 'text/plain' });
        expect(result).toEqual({ Authorization: REDACTED_VALUE, cookie: REDACTED_VALUE, 'content-type': 'text/plain' });
    });

    it('uses a custom header list', () => {
        expect(redactHeaders({ authorization: 'x', 'x-custom': 'y' }, ['X-Custom'])).toEqual({ authorization: 'x', 'x-custom': REDACTED_VALUE });
    });

    it('redacts nothing with an empty list', () => {
        expect(redactHeaders({ authorization: 'x' }, [])).toEqual({ authorization: 'x' });
    });

    it('does not mutate the input', () => {
        const input = { authorization: 'x' };
        redactHeaders(input);
        expect(input).toEqual({ authorization: 'x' });
    });
});

describe('simpleHash / hashJsonObject', () => {
    it('produces a stable 32-character hex hash', () => {
        expect(simpleHash('hello')).toMatch(/^[0-9a-f]{32}$/);
        expect(simpleHash('hello')).toBe(simpleHash('hello'));
        expect(simpleHash('hello')).not.toBe(simpleHash('world'));
    });

    it('ignores key order', () => {
        expect(hashJsonObject({ a: 1, b: { c: 2, d: 3 } })).toBe(hashJsonObject({ b: { d: 3, c: 2 }, a: 1 }));
    });

    it('returns an empty string for non-objects', () => {
        expect(hashJsonObject(null)).toBe('');
        expect(hashJsonObject('str')).toBe('');
    });
});

describe('getTraceId', () => {
    it('reads the trace ID from array-form requestInit headers', () => {
        expect(getTraceId({ requestInit: { headers: [['x-datadog-trace-id', '123'], ['other', 'x']] } })).toBe('123');
    });

    it('returns null when missing or not an array', () => {
        expect(getTraceId({})).toBeNull();
        expect(getTraceId(undefined)).toBeNull();
        expect(getTraceId({ requestInit: { headers: { 'x-datadog-trace-id': '123' } } })).toBeNull();
        expect(getTraceId({ requestInit: { headers: [['other', 'x']] } })).toBeNull();
    });
});

describe('parseBody', () => {
    it('returns null for empty bodies', async () => {
        expect(await parseBody(null)).toBeNull();
        expect(await parseBody('')).toBeNull();
    });

    it('parses JSON strings and streams', async () => {
        expect(await parseBody(' {"a":1} ')).toEqual({ a: 1 });
        expect(await parseBody(new Response('[1,2]').body)).toEqual([1, 2]);
    });

    it('returns raw text for invalid JSON', async () => {
        expect(await parseBody('{not json')).toBe('{not json');
    });

    it('returns trimmed text for non-JSON bodies, including XML', async () => {
        expect(await parseBody('  hello  ')).toBe('hello');
        expect(await parseBody('<a>1</a>')).toBe('<a>1</a>');
    });

    it('handles Buffers', async () => {
        expect(await parseBody(Buffer.from('{"b":2}'))).toEqual({ b: 2 });
    });

    it('returns null for unsupported types', async () => {
        expect(await parseBody(42)).toBeNull();
    });
});

describe('buildDataObject', () => {
    it('extracts request fields', async () => {
        const request = new Request('https://example.com/x', { method: 'POST', body: '{"a":1}', headers: { 'x-foo': 'bar' } });
        const data = await buildDataObject(request);
        expect(data).toMatchObject({ method: 'POST', url: 'https://example.com/x', body: { a: 1 }, status: null });
        expect(data.headers['x-foo']).toBe('bar');
        // The original body must remain readable
        expect(await request.text()).toBe('{"a":1}');
    });

    it('extracts response fields', async () => {
        const response = new Response('ok', { status: 201, headers: { 'content-type': 'text/plain' } });
        const data = await buildDataObject(response);
        expect(data).toMatchObject({ method: null, status: 201, body: 'ok' });
        expect(await response.text()).toBe('ok');
    });
});

describe('getXhrHeaders', () => {
    it('parses a raw XHR header string', () => {
        const headers = getXhrHeaders('content-type: application/json\r\nx-time: 12:30:00\r\n');
        expect(headers.get('content-type')).toBe('application/json');
        expect(headers.get('x-time')).toBe('12:30:00');
    });

    it('returns empty Headers for empty input', () => {
        expect([...getXhrHeaders('').entries()]).toEqual([]);
        expect([...getXhrHeaders(null).entries()]).toEqual([]);
    });
});
