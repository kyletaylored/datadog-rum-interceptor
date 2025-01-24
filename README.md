# Datadog RUM Interceptor

A lightweight library that intercepts **HTTP/HTTPS** (Node) or **fetch/XMLHttpRequest** (Browser) requests, forwarding request/response data to **Datadog** logs or RUM **if** they are detected (e.g., `window.DD_LOGS`, `window.DD_RUM`). It supports both environments via separate Vite builds:

1. **Browser** build: Uses `FetchInterceptor` and `XMLHttpRequestInterceptor`.  
2. **Node** build: Uses `ClientRequestInterceptor` and `XMLHttpRequestInterceptor`.

---

## Table of Contents

1. [Features](#features)  
1. [Installation](#installation)  
1. [Usage](#usage)  
   - [Browser UMD](#browser-umd)  
   - [Browser ES Module](#browser-es-module)  
   - [Node (CommonJS/ESM)](#node-commonjsesm)  
1. [Configuration Options](#configuration-options)  
1. [License](#license)

---

## 1. Features

- **Interception**: Captures HTTP/HTTPS requests (Node) or fetch/XHR requests (Browser).  
- **Datadog Integration**: If `DD_LOGS` or `DD_RUM` is available, logs request/response data and optional RUM actions.  
- **Flexible**: Does not auto-initialize Datadog logs; you can handle that separately.  
- **Node & Browser**: Separate builds ensure you only bundle relevant interceptors per environment.  
- **Stop Interception**: A simple `.stop()` method disposes the hooks when you’re done.

---

## 2. Installation

```bash
npm install @kyletaylored/datadog-rum-interceptor
```

---

## Usage

### Browser UMD

If you load **`datadog-rum-interceptor.browser.umd.js`** directly in a `<script>` tag, it attaches itself to `window.DD_RUM_REQUEST` (assuming `name: 'DD_RUM_REQUEST'` in your Vite config).

```html
<script src="https://www.datadoghq-browser-agent.com/us1/v6/datadog-logs.js"></script>
<script>
  // Optionally init Datadog logs
  window.DD_LOGS && window.DD_LOGS.init({
    clientToken: '...',
    site: 'datadoghq.com'
  })
</script>

<script src="https://www.unpkg.com/@kyletaylored/datadog-rum-interceptor@latest/dist/browser/datadog-rum-interceptor.browser.umd.js"></script>
<script>
  // Now window.DD_RUM_REQUEST is available
  const interceptor = window.DD_RUM_REQUEST.createBrowserInterceptor({
    enableRumIntegration: true
    // ...
  })

  // interceptor.stop() to end interception
</script>
```

### Browser ES Module

You can also import the **ES** build from `datadog-rum-interceptor.browser.es.js` in a modern environment or bundler:

```js
import { createBrowserInterceptor } from './datadog-rum-interceptor.browser.es.js'

const interceptor = createBrowserInterceptor({
  enableRumIntegration: true
})
// ...
interceptor.stop()
```

### Node (CommonJS/ESM)

If you’re using **Node** (CJS or ESM), import the build from `dist/node/`:

- **CommonJS**:
  ```js
  const { createNodeInterceptor } = require('@kyletaylored/datadog-rum-interceptor')
  
  const interceptor = createNodeInterceptor()
  // ...
  interceptor.stop()
  ```
- **ESM**:
  ```js
  import { createNodeInterceptor } from '@kyletaylored/datadog-rum-interceptor'

  const interceptor = createNodeInterceptor()
  // ...
  interceptor.stop()
  ```

> **Note**: Datadog Browser Logs typically doesn’t run in pure Node. If you have a Node environment that somehow sets `global.DD_LOGS`, the library will detect and use it. Otherwise, it won’t attempt to log.

---

## Configuration Options

Both `createBrowserInterceptor` and `createNodeInterceptor` accept similar options:

```js
{
  enableRumIntegration?: boolean,     // default false
  rumGlobalVarName?: string          // default "DD_RUM"
}
```

- **`enableRumIntegration`**: If `true`, the library tries to call `window.DD_RUM.addAction(...)` (or your custom global) for each request.  
- **`rumGlobalVarName`**: The name of the RUM global variable, typically `'DD_RUM'`.