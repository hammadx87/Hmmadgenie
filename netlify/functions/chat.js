const fetch = require('node-fetch');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../../.env' });
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
    }    console.log('Making request to Gemini API...', new Date().toISOString());
    
    // Format the request data according to Gemini API requirements
    const requestData = {
      contents: [{
        parts: [{
          text: requestBody.contents[requestBody.contents.length - 1].parts[0].text
        }]
      }],
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };// Make request to Gemini API with API key in URL
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      }
    );

    // Handle non-200 responses from Gemini API
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: { 
            message: errorData.error?.message || 'An error occurred while processing your request',
            code: response.status
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          message: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      })
    };
  }
};
