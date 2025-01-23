# Datadog RUM Interceptor

A lightweight library that **intercepts** HTTP/HTTPS/fetch/XMLHttpRequest requests in **Node** or the **browser**, then forwards request/response data to **Datadog** logs for easier debugging. Optionally integrates with **Datadog RUM** to attach custom attributes for deeper correlation.

---

## Table of Contents

1. [Key Features](#key-features)  
2. [Installation](#installation)  
3. [Usage](#usage)  
   - [Node (CommonJS)](#node-commonjs)  
   - [ES Module](#es-module)  
   - [Browser via `<script>`](#browser-via-script)  
4. [How It Works](#how-it-works)  
5. [API Reference](#api-reference)  
   - [createRequestInterceptor(options)](#createrequestinterceptoroptions)  
6. [Example Configurations](#example-configurations)  
   - [Datadog Browser Logs](#datadog-browser-logs)  
   - [Datadog RUM Integration](#datadog-rum-integration)  
7. [Building from Source](#building-from-source)  
8. [Running Tests](#running-tests)  
9. [License](#license)

---

## 1. Key Features

- **Captures** request and response data (bodies, headers, status, etc.) in both Node.js and browser environments.  
- **Logs** this data to **Datadog Browser Logs** for troubleshooting.  
- **Correlates** logs with traces by extracting `x-datadog-trace-id` headers.  
- **Optionally** enriches **Datadog RUM** events to show relevant request details in RUM sessions.  
- **Composable**: Start and stop intercepting at any time by invoking the returned controller.

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

## 3. Usage

### Node (CommonJS)

```js
const { createRequestInterceptor } = require('@kyletaylored/datadog-rum-interceptor')

const interceptorController = createRequestInterceptor({
  datadogLogsConfig: {
    clientToken: 'YOUR_DD_CLIENT_TOKEN',
    site: 'datadoghq.com'
  }
})

// Make your http/https requests
// The interceptor listens for them and, if window is undefined (Node environment),
// it won't call datadogLogs.init(). The requests themselves are still captured.
```

> **Note**: Since `@datadog/browser-logs` is primarily a browser SDK, Node usage may not actually forward logs to Datadog unless you have an environment that simulates or supports the browser logs library. Consider using [Datadog’s Node logs library](https://www.npmjs.com/package/@datadog/datadog-ci) if you need direct Node logging.

### ES Module

If your environment supports ESM or you’re using a bundler like Webpack, Rollup, or Vite:

```js
import { createRequestInterceptor } from '@kyletaylored/datadog-rum-interceptor'

const interceptorController = createRequestInterceptor({
  datadogLogsConfig: {
    clientToken: 'YOUR_DD_CLIENT_TOKEN',
    site: 'datadoghq.com',
    forwardErrorsToLogs: true,
    sessionSampleRate: 100
  },
  enableRumIntegration: true
})

// ...
// To stop intercepting later:
// interceptorController.stop()
```

### Browser via `<script>`

Include the **browser build** in a script tag (e.g., from your own CDN or [unpkg](https://unpkg.com)):

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Datadog RUM Interceptor Demo</title>
    <!-- Optional: Datadog RUM script if you'd like RUM integration -->
    <script src="https://www.datadoghq-browser-agent.com/us1/v4/datadog-rum.js"></script>
    <script>
      if (window.DD_RUM) {
        window.DD_RUM.init({
          clientToken: 'YOUR_RUM_CLIENT_TOKEN',
          applicationId: 'YOUR_APP_ID',
          site: 'datadoghq.com'
        })
      }
    </script>

    <!-- The interceptor library (UMD or ES build from dist/browser) -->
    <script src="https://unpkg.com/@kyletaylored/datadog-rum-interceptor/dist/browser/index.js"></script>
  </head>
  <body>
    <script>
      // The library attaches itself to window.DDRumInterceptor
      const { createRequestInterceptor } = window.DDRumInterceptor

      const interceptorController = createRequestInterceptor({
        datadogLogsConfig: {
          clientToken: 'YOUR_DD_CLIENT_TOKEN',
          site: 'datadoghq.com'
        },
        enableRumIntegration: true
      })

      // Now any fetch or XHR calls will be intercepted and logged to Datadog
      fetch('https://jsonplaceholder.typicode.com/todos/1')
        .then(resp => resp.json())
        .then(data => console.log('Fetch response:', data))
    </script>
  </body>
</html>
```

---

## 4. How It Works

**Under the Hood:**

1. In **Node**, the library sets up interceptors for `http`/`https` requests using [`ClientRequestInterceptor`](https://github.com/mswjs/interceptors/tree/main/packages/interceptors/ClientRequest).  
2. In the **browser**, it intercepts `fetch` and `XMLHttpRequest` using [`FetchInterceptor`](https://github.com/mswjs/interceptors/tree/main/packages/interceptors/fetch) and [`XMLHttpRequestInterceptor`](https://github.com/mswjs/interceptors/tree/main/packages/interceptors/XMLHttpRequest).  
3. When a request completes, the interceptor captures **request/response bodies**, **headers**, and **status**.  
4. If running in a browser (i.e., `typeof window !== 'undefined'`), it attempts to log these details to **Datadog Browser Logs**—**including** any `x-datadog-trace-id` header for correlation.  
5. If **RUM** is enabled (`enableRumIntegration = true`), the library tries to attach an action to the global RUM object (`window.DD_RUM` by default) with key info about the intercepted request.

---

## 5. API Reference

### `createRequestInterceptor(options)`

Creates and applies interceptors for the **Node** or **browser** environment automatically:

```ts
type DatadogBrowserLogsConfig = {
  clientToken: string
  site: string
  forwardErrorsToLogs?: boolean
  sessionSampleRate?: number
  // ...other properties supported by @datadog/browser-logs
}

type InterceptorOptions = {
  datadogLogsConfig?: DatadogBrowserLogsConfig
  enableRumIntegration?: boolean
  rumGlobalVarName?: string // defaults to "DD_RUM"
}

function createRequestInterceptor(options?: InterceptorOptions): {
  stop: () => void
}
```

**Parameters**:  
- **datadogLogsConfig**: Configuration for Datadog Browser Logs. If in a **browser** environment and these values are valid, the library calls `datadogLogs.init()`.  
  - `clientToken`: Your Datadog Logs client token (required).  
  - `site`: Datadoghq site, e.g. `"datadoghq.com"`.  
  - `forwardErrorsToLogs`: Capture console errors into logs.  
  - `sessionSampleRate`: Sample rate for sessions, defaults to `100`.  
- **enableRumIntegration**: If `true`, attaches request details to RUM events if `window.DD_RUM` is present.  
- **rumGlobalVarName**: By default `'DD_RUM'`, the global variable name for the RUM object.

**Returns**:  
- An **object** with a single method `stop()`, which disposes the interception hooks.

---

## 6. Example Configurations

### Datadog Browser Logs

To initialize logs in the browser, you must provide a valid `clientToken` and `site`:

```js
createRequestInterceptor({
  datadogLogsConfig: {
    clientToken: 'abc123',
    site: 'datadoghq.com',
    forwardErrorsToLogs: true,
    sessionSampleRate: 100
  }
})
```

If `clientToken` or `site` is missing, the library logs a warning and skips Datadog logs setup.

### Datadog RUM Integration

If you want to add an action to **Datadog RUM** for each request, set `enableRumIntegration: true`. Then, if `window.DD_RUM` (or your custom `rumGlobalVarName`) supports `addAction()`, each intercepted request triggers a custom action:

```js
createRequestInterceptor({
  datadogLogsConfig: { clientToken: '...', site: '...' },
  enableRumIntegration: true,
  rumGlobalVarName: 'DD_RUM' // optional
})
```

You’ll see an event named `"intercepted_request"` in your RUM session data, containing request method, URL, trace ID (if any), and status.

---

## 7. Building from Source

If you’d like to modify the library:

1. **Clone** this repo:
   ```bash
   git clone https://github.com/kyletaylored/datadog-rum-interceptor.git
   ```
2. **Install** dependencies:
   ```bash
   cd datadog-rum-interceptor
   npm install
   ```
3. **Build** all targets (Node CJS, ESM, Browser):
   ```bash
   npm run build
   ```
4. Final bundles are in the `dist/` directory.

---

### Questions or Issues?

Please open a discussion or file an [issue](https://github.com/kyletaylored/datadog-rum-interceptor/issues). We’re happy to help!