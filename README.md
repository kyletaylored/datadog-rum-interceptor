# Datadog RUM Interceptor

A network request interceptor that automatically captures and logs request/response data to Datadog RUM and Logs.

## Features

- 🔄 Automatically intercepts XHR and Fetch requests
- 🔗 Integrates with existing Datadog RUM configuration
- 📝 Optional browser logs integration
- 🔒 Built-in data sanitization
- ⚡ Zero dependencies (except Datadog SDKs)
- 📦 TypeScript support
- 🎯 URL filtering
- 🔧 Customizable request/response processing

## Installation

```bash
# Using npm
npm install @kyletaylored/datadog-rum-interceptor

# Using yarn
yarn add @kyletaylored/datadog-rum-interceptor
```

Or via CDN:
```html
<script src="https://npm.pkg.github.com/@kyletaylored/datadog-rum-interceptor/dist/datadog-rum-interceptor.min.js"></script>
```

## Prerequisites

- @datadog/browser-rum >= 6.0.0
- @datadog/browser-logs >= 6.0.0 (if using logs feature)

## Usage

First, initialize Datadog RUM as you normally would:

```javascript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'DATADOG_APPLICATION_ID',
  clientToken: 'DATADOG_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'your-service'
});
```

Then add the interceptor:

```javascript
import { DDRumInterceptor } from '@kyletaylored/datadog-rum-interceptor';

const interceptor = new DDRumInterceptor({
  // All configuration is optional
  enableLogs: true,
  excludeUrls: ['/health', /analytics/],
  sanitizeFields: ['password', 'token', 'apiKey'],
  maxBodySize: 100000, // 100KB
  sampleRate: 100,
  beforeRequestLog: (request) => {
    // Modify or filter request logging
    return request;
  },
  afterResponseLog: (response, request) => {
    // Modify or filter response logging
    return response;
  }
});

interceptor.init();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableLogs` | boolean | true | Enable logging to Datadog Logs |
| `sampleRate` | number | 100 | Percentage of requests to log (1-100) |
| `maxBodySize` | number | 100000 | Maximum size of request/response bodies to log |
| `excludeUrls` | Array<string \| RegExp> | [] | URLs to exclude from logging |
| `sanitizeFields` | string[] | ['password', 'token', 'apiKey', 'secret'] | Fields to redact |
| `beforeRequestLog` | Function | (req) => req | Process request before logging |
| `afterResponseLog` | Function | (res, req) => res | Process response before logging |

## Custom Processing

You can modify or filter requests/responses before they're logged:

```javascript
const interceptor = new DDRumInterceptor({
  beforeRequestLog: (request) => {
    if (request.url.includes('/sensitive')) {
      return false; // Don't log this request
    }
    // Modify request data
    request.headers['X-Custom'] = 'value';
    return request;
  },
  afterResponseLog: (response, request) => {
    // Add custom data
    response.customField = 'value';
    return response;
  }
});
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { DDRumInterceptor, DDInterceptorConfig } from '@kyletaylored/datadog-rum-interceptor';

const config: DDInterceptorConfig = {
  enableLogs: true,
  // ...
};
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details
