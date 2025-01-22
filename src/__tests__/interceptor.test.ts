import { DDRumInterceptor } from '../interceptor';

describe('DDRumInterceptor', () => {
    it('should initialize with default configuration', () => {
        const interceptor = new DDRumInterceptor();
        expect(interceptor).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
        const customConfig = {
            enableLogs: false,
            sampleRate: 50,
            excludeUrls: ['/test', /analytics/],
        };

        const interceptor = new DDRumInterceptor(customConfig);
        expect(interceptor).toBeDefined();
        expect(interceptor['config']).toMatchObject({
            enableLogs: false,
            sampleRate: 50,
            excludeUrls: ['/test', /analytics/],
        });
    });

    it('should throw error if Datadog RUM is not initialized', () => {
        const interceptor = new DDRumInterceptor();
        expect(() => interceptor.init()).toThrow(
            'Datadog RUM must be initialized before DDRumInterceptor.'
        );
    });

    it('should exclude URLs based on configuration', () => {
        const interceptor = new DDRumInterceptor({
            excludeUrls: ['/exclude-me', /ignore-this/],
        });

        const request = { url: '/exclude-me' } as any; // Simplified request object
        const result = interceptor['processRequest'](request);
        expect(result).toBe(false); // Should exclude the URL
    });
});
