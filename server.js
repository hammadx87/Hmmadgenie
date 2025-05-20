const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    console.log('Making request to Gemini API...', new Date().toISOString());
    console.log('Request body contents:', JSON.stringify(req.body.contents));
    
    // Extract the latest user message
    const latestUserMessage = req.body.contents[req.body.contents.length - 1].parts[0].text;
    console.log('Latest user message:', latestUserMessage);
    
    // Format the request data according to Gemini API requirements
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

    // Make request to Gemini API with API key in URL
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        timeout: 60000 // 60 seconds timeout
      }
    );

    // Handle non-200 responses from Gemini API
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', JSON.stringify(errorData));
      return res.status(response.status).json({ 
        error: { 
          message: errorData.error?.message || 'An error occurred while processing your request',
          code: response.status
        }
      });
    }

    // Parse and validate Gemini API response
    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid response from Gemini API:', data);
      return res.status(500).json({ error: { message: 'Invalid response from AI service' } });
    }

    console.log('Response with status 200');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in chat function:', error);
    return res.status(500).json({
      error: {
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
