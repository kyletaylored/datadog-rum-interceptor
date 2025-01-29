# **Datadog RUM Interceptor**

**A lightweight request/response interceptor for Datadog RUM, providing enhanced payload visibility for debugging and monitoring.**

## **Features**

- Intercepts Fetch & XHR requests
- Captures request & response payloads
- Seamlessly integrates with Datadog RUM
- Uses Trace ID if available, falls back to fingerprinting
- Automatically evicts unmatched requests after 5 seconds

---

## **Installation**

```bash
npm install datadog-rum-interceptor
```

or via CDN:

```html
<script src="https://cdn.example.com/datadog-rum-interceptor.js"></script>
```

---

## **Quick Start**

### **1. Initialize the Interceptor**

Add the interceptor **before** initializing Datadog RUM:

```javascript
const DRI = window.DD_RUM_INTERCEPTOR.init({
  debug: true, // Enable debugging logs (optional)
});
```

---

### **2. Integrate with Datadog RUM**

Use the **beforeSend** callback to attach intercepted data:

```javascript
window.DD_RUM.init({
  applicationId: "YOUR_APP_ID",
  clientToken: "YOUR_CLIENT_TOKEN",
  site: "datadoghq.com",
  service: "your-service",
  sessionSampleRate: 100,
  beforeSend: (event, context) => {
    if (event.type === "resource") {
      console.log(`Intercepted ${event.resource.type} request...`);

      // Automatically retrieve the payload
      const payload = DRI.getPayload({ event, context });
      if (payload) {
        event.context.payload = payload;
      }
    }
    return true;
  },
});
```

---

## **How It Works**

1. **Intercepts HTTP requests**
   - Uses `@mswjs/interceptors` to listen for **Fetch & XHR requests**.
2. **Links Requests & Responses**
   - If **Trace ID exists**, it’s used for tracking.
   - If **Trace ID is missing**, a **fingerprint (method, URL, status, timestamp)** is generated.
3. **Stores data temporarily**
   - **Request data is stored using `requestId`** until the response is received.
   - **Unmatched requests are automatically evicted after 5 seconds**.
4. **Retrieves payload in `beforeSend`**
   - The `getPayload({ event, context })` method **automatically** finds and attaches the payload.

---

## **Example Output**

Captured request & response payload structure:

```json
{
  "request": {
    "method": "POST",
    "url": "https://api.example.com/data",
    "headers": {
      "content-type": "application/json"
    },
    "timestamp": 1738123332089
  },
  "response": {
    "status": 200,
    "headers": {
      "content-type": "application/json"
    },
    "body": {
      "message": "Success"
    },
    "timestamp": 1738123333099
  }
}
```

---

## **API Reference**

### **`init(config: object)`**

Initializes the interceptor.

```javascript
const DRI = window.DD_RUM_INTERCEPTOR.init({ debug: true });
```

| Option  | Type   | Default | Description                  |
| ------- | ------ | ------- | ---------------------------- |
| `debug` | `bool` | `false` | Enable logging for debugging |

---

### **`getPayload({ event, context }): object | null`**

Retrieves the **request/response payload** for a given Datadog RUM event.

```javascript
const data = DRI.getPayload({ event, context });
console.log(data);
```

| Parameter   | Type     | Description                     |
| ----------- | -------- | ------------------------------- | -------------------------------------------------- |
| `event`     | `object` | The Datadog RUM event object.   |
| `context`   | `object` | The Datadog RUM context object. |
| **Returns** | `object  | null`                           | The extracted payload data or `null` if not found. |

---

### **`stop()`**

Stops the interceptor and cleans up resources.

```javascript
DRI.stop();
```

---

## **Troubleshooting**

### **No request data is being captured**

- Ensure **interceptor is initialized before Datadog RUM**.
- Verify `beforeSend` is correctly configured.

### **Requests with Trace ID are not matching**

- Check if Datadog **injects trace headers** (`x-datadog-trace-id`).
- If missing, the **fingerprinting fallback** will be used.
