# Datadog RUM Interceptor

**Datadog RUM Interceptor** is a lightweight library designed to intercept HTTP/HTTPS or Fetch/XHR requests, inject the `x-datadog-trace-id` header, and log request/response payloads to Datadog RUM and Logs with data masking capabilities.

## Overview

- **Trace ID Injection**: Automatically injects `x-datadog-trace-id` into eligible requests.
- **Payload Logging**: Logs intercepted requests and responses to Datadog Logs.
- **Data Masking**: Masks sensitive fields in request and response bodies to protect information.
- **Flexible Configuration**: Allows exclusion of specific URLs and custom processing before logging.

## Installation

Install the interceptor along with the required peer dependencies using npm or Yarn:

```bash
npm install @kyletaylored/datadog-rum-interceptor @datadog/browser-core @datadog/browser-rum @datadog/browser-logs
```

or

```bash
yarn add @kyletaylored/datadog-rum-interceptor @datadog/browser-core @datadog/browser-rum @datadog/browser-logs
```

## Usage

### Browser Integration

1. **Include Datadog RUM and Logs Scripts**

   Ensure that the Datadog RUM and Logs scripts are loaded in your HTML **before** the interceptor script:

   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Datadog RUM + Interceptor Example</title>
       <!-- Load Datadog Logs Library -->
       <script>
           (function(h,o,u,n,d) {
               h=h[d]=h[d]||{q:[],onReady:function(c){h.q.push(c)}}
               d=o.createElement(u);d.async=1;d.src=n
               n=o.getElementsByTagName(u)[0];n.parentNode.insertBefore(d,n)
           })(window,document,'script','https://www.datadoghq-browser-agent.com/us1/v6/datadog-logs.js','DD_LOGS');

           window.DD_LOGS.onReady(function() {
               window.DD_LOGS.init({
                   clientToken: 'YOUR_DATADOG_CLIENT_TOKEN',
                   site: 'datadoghq.com',
                   forwardErrorsToLogs: true,
                   sessionSampleRate: 100,
                   // ...other configurations
               });
           });
       </script>
       <!-- Load Datadog RUM Library -->
       <script>
           (function(h,o,u,n,d) {
               h=h[d]=h[d]||{q:[],onReady:function(c){h.q.push(c)}}
               d=o.createElement(u);d.async=1;d.src=n
               n=o.getElementsByTagName(u)[0];n.parentNode.insertBefore(d,n)
           })(window,document,'script','https://www.datadoghq-browser-agent.com/us1/v4/datadog-rum.js','DD_RUM');

           window.DD_RUM.onReady(function() {
               window.DD_RUM.init({
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
           });
       </script>
   </head>
   <body>
       <!-- Your application content -->

       <!-- Load the interceptor script -->
       <script src="dist/browser/datadog-rum-interceptor.browser.umd.js"></script>
       <script>
           // Initialize the interceptor once RUM and Logs are ready
           DD_RUM_INTERCEPTOR.init({
               excludeUrls: [
                   /^https:\/\/private\.example\.com/,
                   (url) => url.includes('exclude-this-path')
               ],
               mask: ['password', 'token'],
               /**
                * beforeLog Callback
                * 
                * Note: This callback only receives and allows modification of the `body` of the request and response.
                */
               beforeLog: (requestBody, responseBody) => {
                   if (requestBody && requestBody.user) {
                       requestBody.user = 'anonymous';
                   }
                   if (responseBody && responseBody.sensitiveInfo) {
                       responseBody.sensitiveInfo = 'redacted';
                   }
                   return { requestBody, responseBody };
               }
           }, 100, 5000); // Optional: pollInterval=100ms, maxWait=5000ms
       </script>
   </body>
   </html>
   ```

### Node.js Integration

1. **Import and Initialize**

   ```javascript
   // Import required modules
   const { datadogLogs } = require('@datadog/browser-logs');
   const { datadogRum } = require('@datadog/browser-rum');
   const { initNodeInterceptor } = require('@kyletaylored/datadog-rum-interceptor');
   const { FetchInterceptor } = require('@mswjs/interceptors/fetch');
   const { XMLHttpRequestInterceptor } = require('@mswjs/interceptors/XMLHttpRequest');

   // Initialize Datadog Logs
   datadogLogs.init({
       clientToken: 'YOUR_DATADOG_CLIENT_TOKEN',
       site: 'datadoghq.com',
       forwardErrorsToLogs: true,
       sessionSampleRate: 100,
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

   // Initialize the interceptor once RUM is ready
   datadogRum.onReady(() => {
       const environmentInterceptors = [
           new FetchInterceptor(),
           new XMLHttpRequestInterceptor()
       ];

       const interceptor = initNodeInterceptor({
           excludeUrls: [
               /^https:\/\/private\.example\.com/,
               (url) => url.includes('exclude-this-path')
           ],
           mask: ['password', 'token'],
           /**
            * beforeLog Callback
            * 
            * Note: This callback only receives and allows modification of the `body` of the request and response.
            */
           beforeLog: (requestBody, responseBody) => {
               if (requestBody && requestBody.user) {
                   requestBody.user = 'anonymous';
               }
               if (responseBody && responseBody.sensitiveInfo) {
                   responseBody.sensitiveInfo = 'redacted';
               }
               return { requestBody, responseBody };
           },
           debug: true // Optional: Enable debug logging
       }, environmentInterceptors);
   });
   ```

## Configuration Options

- **`excludeUrls`** *(Array)*:  
  URLs or paths to exclude from trace ID injection and logging. Supports strings, regular expressions, or callback functions.

  ```javascript
  excludeUrls: [
      /^https:\/\/private\.example\.com/,
      (url) => url.includes('exclude-this-path')
  ],
  ```

- **`mask`** *(Array)*:  
  Fields in the request/response bodies that should be masked to protect sensitive data.

  ```javascript
  mask: ['password', 'token']
  ```

- **`beforeLog`** *(Function)*:  
  A callback function that receives only the `body` of the request and response objects before logging, allowing for custom processing or modification.

  **Important:** The `beforeLog` callback **only** receives and can modify the `body` of the request and response. It **cannot** modify headers or other properties.

  ```javascript
  beforeLog: (requestBody, responseBody) => {
      if (requestBody && requestBody.user) {
          requestBody.user = 'anonymous';
      }
      if (responseBody && responseBody.sensitiveInfo) {
          responseBody.sensitiveInfo = 'redacted';
      }
      return { requestBody, responseBody };
  },
  ```

- **`pollInterval`** *(number)*:  
  Interval in milliseconds between readiness checks (Browser only). Default is `100ms`.

- **`maxWait`** *(number)*:  
  Maximum time in milliseconds to wait for readiness before bailing out (Browser only). Default is `5000ms` or `5 seconds`.

- **`debug`** *(Boolean)*:  
  Enable debugging for log outputs. Useful for development and troubleshooting.

  ```javascript
  debug: true
  ```

## Example Scenarios

### Injecting Trace ID and Logging with Masking

**Browser Example:**

```html
<script>
    window.DD_RUM && window.DD_RUM.onReady(function() {
        const interceptor = DD_RUM_INTERCEPTOR.init({
            excludeUrls: [
                /^https:\/\/private\.example\.com/,
                (url) => url.includes('exclude-this-path')
            ],
            mask: ['password', 'token'],
            /**
             * beforeLog Callback
             * 
             * Note: This callback only receives and allows modification of the `body` of the request and response.
             */
            beforeLog: (requestBody, responseBody) => {
                if (requestBody && requestBody.user) {
                    requestBody.user = 'anonymous';
                }
                if (responseBody && responseBody.sensitiveInfo) {
                    responseBody.sensitiveInfo = 'redacted';
                }
                return { requestBody, responseBody };
            }
        }, 100, 5000); // Optional: pollInterval=100ms, maxWait=5000ms
    });
</script>
```

**Node.js Example:**

```javascript
datadogRum.onReady(() => {
    const environmentInterceptors = [
        new FetchInterceptor(),
        new XMLHttpRequestInterceptor()
    ];

    const interceptor = initNodeInterceptor({
        excludeUrls: [
            /^https:\/\/private\.example\.com/,
            (url) => url.includes('exclude-this-path')
        ],
        mask: ['password', 'token'],
        /**
         * beforeLog Callback
         * 
         * Note: This callback only receives and allows modification of the `body` of the request and response.
         */
        beforeLog: (requestBody, responseBody) => {
            if (requestBody && requestBody.user) {
                requestBody.user = 'anonymous';
            }
            if (responseBody && responseBody.sensitiveInfo) {
                responseBody.sensitiveInfo = 'redacted';
            }
            return { requestBody, responseBody };
        },
        debug: true // Optional: Enable debug logging
    }, environmentInterceptors);
});
```

## Quick Tips

- **Ensure Proper Initialization Order:**  
  - **Browser:** Initialize the interceptor within the `DD_RUM.onReady` callback.
  - **Node.js:** Initialize Logs first, then RUM, and finally the interceptor.

- **Customize Masking:**  
  Update the `mask` array with all sensitive fields relevant to your application to ensure data privacy.

- **Dynamic Exclusions:**  
  Utilize callback functions in `excludeUrls` for more complex URL exclusion logic.

- **Understand `beforeLog` Limitations:**  
  The `beforeLog` callback **only** receives the `body` of the request and response objects. It **cannot** modify headers or other properties. Ensure that any modifications are confined to the `body` to maintain the integrity of the original requests and responses.

## Support

For issues or feature requests, please [open an issue](https://github.com/kyletaylored/datadog-rum-interceptor/issues) on the repository.

---

### **Additional Notes**

#### Understanding the `beforeLog` Callback

The `beforeLog` callback is a powerful feature that allows you to customize the data being logged to Datadog. However, it's important to understand its limitations to use it effectively:

- **Scope of Modification:**  
  The `beforeLog` callback **only** receives the `body` of the request and response. This means you can modify, redact, or enhance the body content but **cannot** alter headers or other properties.

- **Function Signature:**  
  ```javascript
  beforeLog: (requestBody, responseBody) => {
      // Modify requestBody and/or responseBody as needed
      return { requestBody, responseBody };
  },
  ```

- **Example Use Cases:**
  - **Redacting Sensitive Information:**
    ```javascript
    beforeLog: (requestBody, responseBody) => {
        if (requestBody && requestBody.password) {
            requestBody.password = '***REDACTED***';
        }
        return { requestBody, responseBody };
    },
    ```
  
  - **Anonymizing User Data:**
    ```javascript
    beforeLog: (requestBody, responseBody) => {
        if (requestBody && requestBody.user) {
            requestBody.user = 'anonymous';
        }
        return { requestBody, responseBody };
    },
    ```

- **Best Practices:**
  - **Ensure Idempotency:**  
    Make sure that modifications within `beforeLog` are idempotent to avoid inconsistent logging.
  
  - **Handle Edge Cases:**  
    Always check if the `body` exists before attempting to modify it to prevent runtime errors.
  
  - **Maintain Data Integrity:**  
    Avoid introducing errors or inconsistencies in the `body` data that could affect downstream processing or analysis.

By adhering to these guidelines, you can effectively utilize the `beforeLog` callback to enhance your logging strategy while maintaining data integrity and security.

If you have any further questions or need assistance with specific implementations, feel free to reach out!