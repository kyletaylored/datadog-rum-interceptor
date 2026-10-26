import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    storeTemporaryRequest,
    getAndRemoveTemporaryRequest,
    storeInterceptedData,
    getInterceptedData,
    clearInterceptedData,
    generateResponseFingerprint,
} from '../../src/utils/storage.js';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    clearInterceptedData();
    vi.useRealTimers();
});

describe('temporary requests', () => {
    it('are returned once and then removed', () => {
        storeTemporaryRequest('req-1', { url: 'a' });
        expect(getAndRemoveTemporaryRequest('req-1')).toEqual({ url: 'a' });
        expect(getAndRemoveTemporaryRequest('req-1')).toBeNull();
    });

    it('expire after 5 seconds', () => {
        storeTemporaryRequest('req-2', { url: 'a' });
        vi.advanceTimersByTime(5001);
        expect(getAndRemoveTemporaryRequest('req-2')).toBeNull();
    });
});

describe('intercepted data', () => {
    it('is returned once and then removed', () => {
        storeInterceptedData('id-1', { a: 1 });
        expect(getInterceptedData('id-1')).toEqual({ a: 1 });
        expect(getInterceptedData('id-1')).toBeNull();
    });

    it('expires after 30 seconds when unclaimed', () => {
        storeInterceptedData('id-2', { a: 1 });
        vi.advanceTimersByTime(29_999);
        storeInterceptedData('id-3', { b: 2 });
        vi.advanceTimersByTime(2);
        expect(getInterceptedData('id-2')).toBeNull();
        expect(getInterceptedData('id-3')).toEqual({ b: 2 });
    });

    it('restarts the expiry window when an ID is stored again', () => {
        storeInterceptedData('id-4', { v: 1 });
        vi.advanceTimersByTime(20_000);
        storeInterceptedData('id-4', { v: 2 });
        vi.advanceTimersByTime(20_000);
        expect(getInterceptedData('id-4')).toEqual({ v: 2 });
    });

    it('can be cleared', () => {
        storeInterceptedData('id-5', { a: 1 });
        storeTemporaryRequest('req-5', { url: 'a' });
        clearInterceptedData();
        expect(getInterceptedData('id-5')).toBeNull();
        expect(getAndRemoveTemporaryRequest('req-5')).toBeNull();
        expect(vi.getTimerCount()).toBe(1); // only the request timer, which is harmless
    });
});

describe('generateResponseFingerprint', () => {
    const base = { method: 'GET', url: 'https://example.com', status: 200, headers: { a: '1' }, timestamp: 1_700_000_005_000 };

    it('returns null without data', () => {
        expect(generateResponseFingerprint(null)).toBeNull();
    });

    it('is stable within the same 10-second window', () => {
        expect(generateResponseFingerprint(base)).toBe(generateResponseFingerprint({ ...base, timestamp: base.timestamp + 4000 }));
    });

    it('ignores headers browsers never expose to scripts', () => {
        const withCookies = { ...base, headers: { a: '1', 'Set-Cookie': 'session=secret', 'set-cookie2': 'x=y' } };
        expect(generateResponseFingerprint(withCookies)).toBe(generateResponseFingerprint(base));
    });

    it('changes across windows and attributes', () => {
        const fp = generateResponseFingerprint(base);
        expect(generateResponseFingerprint({ ...base, timestamp: base.timestamp + 10_000 })).not.toBe(fp);
        expect(generateResponseFingerprint({ ...base, status: 500 })).not.toBe(fp);
        expect(generateResponseFingerprint({ ...base, headers: { a: '2' } })).not.toBe(fp);
    });
});
