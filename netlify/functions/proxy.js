/**
 * Netlify Serverless Function - CORS Proxy for web app
 *
 * Handles cross-origin fetch requests from the browser.
 * Receives a URL via POST request and returns the fetched content.
 */

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { url } = body;

    // Validate URL
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    // Prevent invalid URLs
    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid URL format' })
      };
    }

    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SiteCrawlerBot/1.0)'
      },
      timeout: 30000
    });

    clearTimeout(timeout);

    // Get response data
    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      data = await response.text();
    } else {
      // For binary content, convert to base64
      const buffer = await response.buffer();
      data = buffer.toString('base64');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data,
        url: url
      })
    };
  } catch (error) {
    // Handle different error types
    let status = 500;
    let message = error.message;

    if (error.name === 'AbortError') {
      status = 504;
      message = 'Request timeout';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      status = 503;
      message = 'Host unreachable';
    }

    return {
      statusCode: status,
      body: JSON.stringify({
        ok: false,
        status: status,
        statusText: 'Error',
        error: message,
        data: ''
      })
    };
  }
};
