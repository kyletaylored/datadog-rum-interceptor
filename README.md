# Datadog RUM Interceptor

A lightweight library that intercepts **HTTP/HTTPS** (Node) or **fetch/XMLHttpRequest** (Browser) requests, forwarding request/response data to **Datadog** logs or RUM **if** they are detected (e.g., `window.DD_LOGS`, `window.DD_RUM`). It supports both environments via separate Vite builds:

1. **Browser** build: Uses `FetchInterceptor` and `XMLHttpRequestInterceptor`.  
2. **Node** build: Uses `ClientRequestInterceptor` and `XMLHttpRequestInterceptor`.

---

## Table of Contents

1. [Features](#features)  
2. [Installation](#installation)  
3. [Project Structure](#project-structure)  
4. [Building](#building)  
5. [Usage](#usage)  
   - [Browser UMD](#browser-umd)  
   - [Browser ES Module](#browser-es-module)  
   - [Node (CommonJS/ESM)](#node-commonjsesm)  
6. [Configuration Options](#configuration-options)  
7. [Testing](#testing)  
8. [License](#license)

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

or

```bash
yarn add @kyletaylored/datadog-rum-interceptor
```

---

## 3. Project Structure

Here’s a high-level view of how the **two-build** approach is organized:

```
src/
├─ baseInterceptor.js       # Shared logic (logs, RUM integration)
├─ browserIndex.js          # Browser entry (FetchInterceptor + XHR)
├─ nodeIndex.js             # Node entry (ClientRequestInterceptor + XHR)
└─ ...                     # Other utility or type files

dist/
├─ browser/
│   ├─ datadog-rum-interceptor.browser.es.js
│   └─ datadog-rum-interceptor.browser.umd.js
└─ node/
    ├─ datadog-rum-interceptor.node.cjs.js
    └─ datadog-rum-interceptor.node.es.js

test/
├─ browserInterceptor.test.js  # Jest + jsdom
└─ nodeInterceptor.test.js     # Jest in Node env
```

- **`browserIndex.js`** imports only `FetchInterceptor` and `XMLHttpRequestInterceptor`.
- **`nodeIndex.js`** imports `ClientRequestInterceptor` and `XMLHttpRequestInterceptor`.
- **`baseInterceptor.js`** sets up the shared logging logic (`DD_LOGS`, `DD_RUM` detection, etc.) with a single function.

---

## 4. Building

We use **Vite** with **two config files**:

- **`vite.config.browser.js`**: Builds the **browser** version into `dist/browser/`.  
- **`vite.config.node.js`**: Builds the **Node** version into `dist/node/`.  

**Scripts** in `package.json`:

```jsonc
{
  "scripts": {
    "build:browser": "vite build --config vite.config.browser.js",
    "build:node": "vite build --config vite.config.node.js",
    "build": "npm run build:browser && npm run build:node"
  }
}
```

Running:

```bash
npm run build
```

produces:

```
dist/
├─ browser/
│   ├─ datadog-rum-interceptor.browser.es.js
│   └─ datadog-rum-interceptor.browser.umd.js
└─ node/
    ├─ datadog-rum-interceptor.node.cjs.js
    └─ datadog-rum-interceptor.node.es.js
```

---

## 5. Usage

### 5.1 Browser UMD

If you load **`dist/browser/datadog-rum-interceptor.browser.umd.js`** directly in a `<script>` tag, it attaches itself to `window.DD_RUM_REQUEST` (assuming `name: 'DD_RUM_REQUEST'` in your Vite config).

```html
<script src="https://www.datadoghq-browser-agent.com/us1/v6/datadog-logs.js"></script>
<script>
  // Optionally init Datadog logs
  window.DD_LOGS && window.DD_LOGS.init({
    clientToken: '...',
    site: 'datadoghq.com'
  })
</script>

<script src="dist/browser/datadog-rum-interceptor.browser.umd.js"></script>
<script>
  // Now window.DD_RUM_REQUEST is available
  const interceptor = window.DD_RUM_REQUEST.createBrowserInterceptor({
    enableRumIntegration: true
    // ...
  })

  // interceptor.stop() to end interception
</script>
```

### 5.2 Browser ES Module

You can also import the **ES** build from `dist/browser/datadog-rum-interceptor.browser.es.js` in a modern environment or bundler:

```js
import { createBrowserInterceptor } from './dist/browser/datadog-rum-interceptor.browser.es.js'

const interceptor = createBrowserInterceptor({
  enableRumIntegration: true
})
// ...
interceptor.stop()
```

### 5.3 Node (CommonJS/ESM)

If you’re using **Node** (CJS or ESM), import the build from `dist/node/`:

- **CommonJS**:
  ```js
  const { createNodeInterceptor } = require('@kyletaylored/datadog-rum-interceptor/dist/node/datadog-rum-interceptor.node.cjs.js')
  
  const interceptor = createNodeInterceptor()
  // ...
  interceptor.stop()
  ```
- **ESM**:
  ```js
  import { createNodeInterceptor } from '@kyletaylored/datadog-rum-interceptor/dist/node/datadog-rum-interceptor.node.es.js'

  const interceptor = createNodeInterceptor()
  // ...
  interceptor.stop()
  ```

> **Note**: Datadog Browser Logs typically doesn’t run in pure Node. If you have a Node environment that somehow sets `global.DD_LOGS`, the library will detect and use it. Otherwise, it won’t attempt to log.

---

## 6. Configuration Options

Both `createBrowserInterceptor` and `createNodeInterceptor` accept similar options:

```js
{
  enableRumIntegration?: boolean,     // default false
  rumGlobalVarName?: string          // default "DD_RUM"
}
```

- **`enableRumIntegration`**: If `true`, the library tries to call `window.DD_RUM.addAction(...)` (or your custom global) for each request.  
- **`rumGlobalVarName`**: The name of the RUM global variable, typically `'DD_RUM'`.