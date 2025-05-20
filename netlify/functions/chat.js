const fetch = require('node-fetch');

// Production-ready environment variable handling
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('CRITICAL ERROR: GEMINI_API_KEY environment variable is not set');
  console.error('Please add GEMINI_API_KEY to your Netlify environment variables:');
  console.error('Netlify Dashboard > Site Settings > Build & Deploy > Environment Variables');
}

// Note: Rate limiting has been removed as it's not effective in a serverless environment
// For production rate limiting, consider using Netlify Edge Functions or a database/cache

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

    // Check for API key before proceeding
    if (!GEMINI_API_KEY) {
      console.error('Request failed: GEMINI_API_KEY is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: {
            message: 'Server configuration error: Missing API key',
            details: 'The GEMINI_API_KEY environment variable is not set in Netlify. Please check deployment settings.'
          }
        })
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

    // Make request to Gemini API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

    let response;
    try {
      console.log('Sending request to Gemini API...');
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        console.error('Gemini API Error:', response.status, JSON.stringify(errorData));
      } catch (e) {
        console.error('Failed to parse error response:', e.message);
        console.error('Response status:', response.status);
        console.error('Response text:', await response.text().catch(() => 'Unable to get response text'));
        errorData = { error: { message: 'Unknown error from Gemini API' } };
      }

      // Return appropriate error response
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: {
            message: errorData.error?.message || `Error from Gemini API (${response.status})`,
            status: response.status,
            details: errorData.error?.details || 'No additional details available'
          }
        })
      };
    }

    // Parse and validate Gemini API response
    let data;
    try {
      data = await response.json();

      // Validate response structure
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('Invalid response structure from Gemini API:', JSON.stringify(data));
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: {
              message: 'Invalid response structure from Gemini API',
              details: 'The API response did not contain the expected data structure'
            }
          })
        };
      }
    } catch (error) {
      console.error('Error parsing Gemini API response:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: {
            message: 'Error parsing Gemini API response',
            details: error.message
          }
        })
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);

    // Check if it's a network error
    const isNetworkError = error.message && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('network')
    );

    // Check if it's a timeout error
    const isTimeoutError = error.name === 'AbortError' ||
      (error.message && error.message.includes('timeout'));

    // Return appropriate error message based on error type
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          message: isNetworkError
            ? 'Unable to connect to AI service. Please try again later.'
            : isTimeoutError
              ? 'Request to AI service timed out. Please try again with a simpler query.'
              : 'Internal server error',
          type: isNetworkError ? 'network_error' : isTimeoutError ? 'timeout_error' : 'server_error',
          details: error.message
        }
      })
    };
  }
};
