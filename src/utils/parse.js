/**
 * Attempt to parse a request/response body based on the Content-Type header.
 * @param {ReadableStream | string | Buffer | null} body - The raw body.
 * @param {string} [contentType] - The Content-Type header value, e.g. "application/json"
 * @returns {Promise<unknown>} Returns a parsed object/string/DOM/etc. if possible
 */
export async function parseBody(body, contentType = '') {
    if (!body) return null

    let bodyText = ''

    // 1. Convert body to text if it's a ReadableStream (browser fetch scenario):
    if (typeof body === 'string') {
        bodyText = body
    } else if (body instanceof ReadableStream) {
        bodyText = await new Response(body).text()
    }
    // Node scenario? Possibly a Buffer or other type:
    // else if (Buffer.isBuffer(body)) {
    //   bodyText = body.toString('utf-8')
    // }
    // ... additional checks as needed.

    // 2. Check Content-Type to decide how to parse:
    const lowerCT = contentType.toLowerCase()

    // - JSON
    if (lowerCT.includes('json')) {
        try {
            return JSON.parse(bodyText)
        } catch (err) {
            // Fallback: return raw text if JSON parse fails
            console.warn('Failed to parse JSON:', err)
            return bodyText
        }
    }

    // - XML
    else if (lowerCT.includes('xml')) {
        // Parse as XML/HTML via DOMParser in the browser:
        if (typeof window !== 'undefined' && window.DOMParser) {
            try {
                const parser = new window.DOMParser()
                const xmlDoc = parser.parseFromString(bodyText, 'text/xml')
                return xmlDoc
            } catch (err) {
                console.warn('Failed to parse XML:', err)
                return bodyText
            }
        }
        // Otherwise, fallback
        return bodyText
    }

    // - other known content types can go here: 
    //   e.g. "text/html", "application/x-www-form-urlencoded", etc.

    // Default fallback: plain text
    return bodyText
}