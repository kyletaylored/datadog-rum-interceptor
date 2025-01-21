// index.ts
import { DDRumInterceptor } from './interceptor';
import { DDInterceptorConfig, RequestInterceptor, ResponseInterceptor } from './types';

export { DDRumInterceptor, DDInterceptorConfig, RequestInterceptor, ResponseInterceptor };

// Default export for easier usage
export default DDRumInterceptor;