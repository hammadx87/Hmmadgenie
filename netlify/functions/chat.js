const fetch = require('node-fetch');

// Production-ready environment variable handling
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('CRITICAL ERROR: GEMINI_API_KEY environment variable is not set');
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API request with retries
async function makeGeminiRequest(requestData, retryCount = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Gemini API Error (Attempt ${retryCount + 1}):`, response.status, JSON.stringify(errorData));
      
      // If we haven't exceeded max retries and it's a retryable error
      if (retryCount < MAX_RETRIES && (response.status === 429 || response.status >= 500)) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await wait(delay);
        return makeGeminiRequest(requestData, retryCount + 1);
      }
      
      throw new Error(errorData.error?.message || `Gemini API error (${response.status})`);
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        console.log(`Request timeout (Attempt ${retryCount + 1}). Retrying...`);
        return makeGeminiRequest(requestData, retryCount + 1);
      }
      throw new Error('All retry attempts timed out');
    }
    throw error;
  }
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Validate method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: { message: 'Method not allowed' } })
    };
  }

  try {
    // Validate request body
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

    // Extract the latest user message
    const latestUserMessage = requestBody.contents[requestBody.contents.length - 1].parts[0].text;
    console.log('Processing request with message:', latestUserMessage.substring(0, 50) + (latestUserMessage.length > 50 ? '...' : ''));

    const requestData = {
      contents: [{
        parts: [{ text: latestUserMessage }]
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

    // Make request with retries
    const response = await makeGeminiRequest(requestData);
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Function error:', error);
    
    // Determine appropriate error message and status code
    let statusCode = 500;
    let errorMessage = 'An internal server error occurred';

    if (error.message.includes('API key not valid')) {
      statusCode = 401;
      errorMessage = 'API key not valid. Please check the configuration.';
    } else if (error.message.includes('timed out')) {
      statusCode = 504;
      errorMessage = 'The request timed out. Please try again with a simpler query.';
    } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: {
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      })
    };
  }
};
