const fetch = require('node-fetch');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../../.env' });
}

// Rate limiting setup
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute
const ipRequestCounts = new Map();

// Clean up old rate limit entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now - data.timestamp > RATE_LIMIT_WINDOW) {
      ipRequestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Rate limiting function
function isRateLimited(ip) {
  const now = Date.now();
  const requestData = ipRequestCounts.get(ip) || { count: 0, timestamp: now };

  // Reset count if the window has expired
  if (now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    requestData.count = 1;
    requestData.timestamp = now;
  } else {
    requestData.count++;
  }

  ipRequestCounts.set(ip, requestData);
  return requestData.count > MAX_REQUESTS_PER_WINDOW;
}

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: { message: 'Method not allowed' } })
    };
  }

  // Check rate limit
  const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'];
  if (isRateLimited(clientIP)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: {
          message: 'Too many requests. Please try again later.',
          retryAfter: RATE_LIMIT_WINDOW / 1000
        }
      })
    };
  }

  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: { message: 'Invalid request body' } })
      };
    }

    if (!requestBody.contents) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: { message: 'Missing required field: contents' } })
      };
    }

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: { message: 'Server configuration error' } })
      };
    }

    console.log('Making request to Gemini API...', new Date().toISOString());

    // Format the request data according to Gemini API requirements
    // Log the incoming request for debugging
    console.log('Request body contents:', JSON.stringify(requestBody.contents));

    // Extract the latest user message
    const latestUserMessage = requestBody.contents[requestBody.contents.length - 1].parts[0].text;
    console.log('Latest user message:', latestUserMessage);

    const requestData = {
      contents: [{
        parts: [{
          text: latestUserMessage
        }]
      }],
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Make request to Gemini API with API key in URL and a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request to Gemini API timed out after 25 seconds');
      }
      throw error;
    }

    // Handle non-200 responses from Gemini API
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Gemini API Error:', JSON.stringify(errorData));
      } catch (e) {
        console.error('Failed to parse error response:', e.message);
        console.error('Response status:', response.status);
        console.error('Response text:', await response.text().catch(() => 'Unable to get response text'));
        errorData = { error: { message: 'Unknown error from Gemini API' } };
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: {
            message: errorData.error?.message || 'An error occurred while processing your request',
            code: response.status,
            details: process.env.NODE_ENV === 'development' ? JSON.stringify(errorData) : undefined
          }
        })
      };
    }

    // Parse and validate Gemini API response
    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid response from Gemini API:', data);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: { message: 'Invalid response from AI service' } })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Error in chat function:', error);
    console.error('Error stack:', error.stack);

    // Check if it's a network error
    const isNetworkError = error.message && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')
    );

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          message: isNetworkError
            ? 'Unable to connect to AI service. Please try again later.'
            : 'Internal server error',
          type: isNetworkError ? 'network_error' : 'server_error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      })
    };
  }
};
