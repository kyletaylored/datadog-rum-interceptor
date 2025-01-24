# Datadog RUM Interceptor

**Datadog RUM Interceptor** is a lightweight, drop-in library designed to seamlessly intercept HTTP/HTTPS or Fetch/XHR requests and responses in your application. It integrates effortlessly with Datadog Real User Monitoring (RUM) and Logs to enable trace correlation without requiring extensive configuration.

## Overview

- **Automatic Integration**: Automatically retrieves `allowedTracingUrls` from your existing Datadog RUM configuration.
- **Minimal Configuration**: Requires minimal setup with straightforward configuration options.
- **Enhanced Security**: **Hardcoded exclusion** of all `*.datadoghq.com` URLs to maintain the integrity of Datadog's internal operations.
- **Flexible Logging**: Offers options to exclude additional specific URLs, mask sensitive fields, and customize logging behavior through callbacks.

## Installation

First, install the interceptor library along with the required peer dependencies:

```bash
npm install @kyletaylored/datadog-rum-interceptor @datadog/browser-rum @datadog/browser-logs
```

or using Yarn:

```bash
yarn add @kyletaylored/datadog-rum-interceptor @datadog/browser-rum @datadog/browser-logs
```

## Usage

### Browser Integration

1. **Include Datadog RUM and Logs Scripts**

   Ensure that the Datadog RUM and Logs scripts are loaded in your HTML before the interceptor script:

   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Datadog RUM + Interceptor Example</title>
       <!-- Load Datadog Logs Library -->
       <script src="https://www.datadoghq-browser-agent.com/us1/v6/datadog-logs.js"></script>
       <!-- Load Datadog RUM Library -->
       <script src="https://www.datadoghq-browser-agent.com/us1/v4/datadog-rum.js"></script>
       <script>
           // Initialize Datadog Logs
           window.datadogLogs && window.datadogLogs.init({
               clientToken: 'YOUR_DATADOG_CLIENT_TOKEN',
               site: 'datadoghq.com',
               forwardErrorsToLogs: true,
               sessionSampleRate: 100,
               // ...other configurations
           });

           // Initialize Datadog RUM
           window.datadogRum && window.datadogRum.init({
               clientToken: 'YOUR_DATADOG_CLIENT_TOKEN',
               applicationId: 'YOUR_APPLICATION_ID',
               site: 'datadoghq.com',
               allowedTracingUrls: [
                   "https://api.example.com",
                   /https:\/\/.*\.my-api-domain\.com/,
                   (url) => url.startsWith("https://api.example.com")
               ],
               // ...other configurations
           });
       </script>
   </head>
   <body>
       <!-- Your application content -->

       <!-- Load your interceptor script last -->
       <script src="dist/browser/datadog-rum-interceptor.browser.umd.js"></script>
       <script>
           // Once RUM is ready, initialize the interceptor
           window.datadogRum && window.datadogRum.onReady(function() {
               // Initialize the interceptor with simplified configuration
               const interceptor = window.DD_RUM_REQUEST.createBrowserInterceptor({
                   // Exclude specific URLs from logging
                   excludeUrls: [
                       /^https:\/\/private\.example\.com/,
                       (url) => url.includes('exclude-this-path')
                   ],

                   // Mask specific fields in the request/response bodies
                   mask: ['password', 'token'],

                   // Optional: Custom processing before logging
                   beforeLog: (request, response) => {
                       // Example: Modify the request body before logging
                       if (request.body && request.body.user) {
                           request.body.user = 'anonymous';
                       }
                       // Return the modified request and response
                       return { request, response };
                   }
               });

               // The interceptor is now active and will log allowed requests/responses
           });
       </script>
   </body>
   </html>
   ```

   **Key Points:**

   - **Load Order:**
     - **First**, load the Datadog Logs and RUM scripts via `<script>` tags.
     - **Initialize** Datadog Logs and RUM **before** loading the interceptor script.
     - **Finally**, load your interceptor script (`datadog-rum-interceptor.browser.umd.js`) after Datadog scripts to ensure that `datadogRum` and `datadogLogs` are available globally.

   - **Interceptor Initialization:**
     - The interceptor is initialized within the `datadogRum.onReady` callback, ensuring that RUM is fully initialized before the interceptor starts processing requests.
     - **Configuration Options:**
       - **`excludeUrls`**: Excludes URLs matching the provided regex or custom function from logging.
       - **`mask`**: Masks the `password` and `token` fields in the request and response bodies.
       - **`beforeLog`**: Modifies the request body by anonymizing the `user` field before logging.

   - **Excluding URLs with Callbacks:**
     - You can provide functions in the `excludeUrls` array to dynamically determine if a URL should be excluded.
     - **Example:**
       ```javascript
       excludeUrls: [
           /^https:\/\/private\.example\.com/,
           (url) => url.includes('exclude-this-path')
       ],
       ```

### Node Integration

1. **Import and Initialize Datadog RUM and Logs**

   ```javascript
   // Import necessary modules
   const { datadogLogs } = require('@datadog/browser-logs');
   const { datadogRum } = require('@datadog/browser-rum');
   const { createNodeInterceptor } = require('@kyletaylored/datadog-rum-interceptor');

   // Initialize Datadog Logs
   datadogLogs.init({
       clientToken: 'YOUR_DATADOG_CLIENT_TOKEN',
       site: 'datadoghq.com',
       forwardErrorsToLogs: true,
       sampleRate: 100,
       // ...other configurations
   });

   // Initialize Datadog RUM
   datadogRum.init({
       clientToken: 'YOUR_DATADOG_CLIENT_TOKEN',
       applicationId: 'YOUR_APPLICATION_ID',
       site: 'datadoghq.com',
       allowedTracingUrls: [
           "https://api.example.com",
           /https:\/\/.*\.my-api-domain\.com/,
           (url) => url.startsWith("https://api.example.com")
       ],
       // ...other configurations
   });

   // Once RUM is ready, initialize the interceptor
   datadogRum.onReady(function() {
       // Initialize the interceptor with simplified configuration
       const interceptor = createNodeInterceptor({
           // Exclude specific URLs from logging
           excludeUrls: [
               /^https:\/\/private\.example\.com/,
               (url) => url.includes('exclude-this-path')
           ],

           // Mask specific fields in the request/response bodies
           mask: ['password', 'token'],

           // Optional: Custom processing before logging
           beforeLog: (request, response) => {
               // Example: Modify the response body before logging
               if (response.body && response.body.data) {
                   response.body.data = '***MASKED***';
               }
               // Return the modified request and response
               return { request, response };
           }
       });

       // The interceptor is now active and will log allowed requests/responses
   });

   // Example HTTP request using http/https module
   const https = require('https');

   https.get('https://api.example.com/data', (res) => {
       let data = '';

       res.on('data', (chunk) => {
           data += chunk;
       });

       res.on('end', () => {
           console.log('Response received:', data);
           // Optionally stop the interceptor if no longer needed
           // interceptor.stop();
       });
   }).on('error', (err) => {
       console.error('Request error:', err);
   });
   ```

   **Key Points:**

   - **Peer Dependencies Installation:**
     - Ensure that `@datadog/browser-rum` and `@datadog/browser-logs` are installed as peer dependencies.
     - **Installation:**
       ```bash
       npm install @kyletaylored/datadog-rum-interceptor @datadog/browser-rum @datadog/browser-logs
       ```
       or
       ```bash
       yarn add @kyletaylored/datadog-rum-interceptor @datadog/browser-rum @datadog/browser-logs
       ```

   - **Initialization Within `onReady`:** Ensures that RUM is fully initialized before the interceptor starts processing requests.

   - **Interceptor Initialization:**
     - The interceptor is initialized within the `datadogRum.onReady` callback, ensuring that RUM is fully initialized before the interceptor starts processing requests.
     - **Configuration Options:**
       - **`excludeUrls`**: Excludes URLs matching the provided regex or custom function from logging.
       - **`mask`**: Masks the `password` and `token` fields in the request and response bodies.
       - **`beforeLog`**: Modifies the response body by masking the `data` field before logging.

   - **Excluding URLs with Callbacks:**
     - You can provide functions in the `excludeUrls` array to dynamically determine if a URL should be excluded.
     - **Example:**
       ```javascript
       excludeUrls: [
           /^https:\/\/private\.example\.com/,
           (url) => url.includes('exclude-this-path')
       ],
       ```

## Configuration Options

When initializing the interceptor, you can provide the following options:

- **`excludeUrls`** *(Array)*:  
  URLs or paths to exclude from logging. Supports strings, regular expressions, or callback functions.

  ```javascript
  excludeUrls: [
      /^https:\/\/private\.example\.com/,
      (url) => url.includes('exclude-this-path')
  ]
  ```

- **`mask`** *(String | Array)*:  
  Fields in the request/response bodies that should be masked. Can be a single string or an array of strings.

  ```javascript
  mask: ['password', 'token']
  ```

- **`beforeLog`** *(Function)*:  
  A callback function that receives the request and response objects, allowing you to modify them before they are logged to Datadog.

  ```javascript
  beforeLog: (request, response) => {
      // Modify request or response
      return { request, response };
  }
  ```

## License

MIT © [Kyle Taylor](mailto:kyle.taylor@datadoghq.com)

---

For any issues or feature requests, please open an issue on the [GitHub repository](https://github.com/kyletaylored/datadog-rum-interceptor).