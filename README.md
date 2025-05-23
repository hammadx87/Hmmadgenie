# PrognosisAI Chatbot

An AI chatbot powered by Google's Gemini API, built with vanilla JavaScript and deployed on Netlify.

## Live Site

Visit the live site: [HammadGenie](https://hammadgenie25.netlify.app)

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/hammadx87/Hmmadgenie.git
   cd Hmmadgenie
   ```

2. Install dependencies:
   ```bash
   npm install
   cd netlify/functions
   npm install
   cd ../..
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. Run locally:
   ```bash
   netlify dev
   ```

## Deployment Workflow

This project uses a development branch workflow:

1. Make changes in the `development` branch:
   ```bash
   git checkout development
   # Make your changes
   git add .
   git commit -m "Description of changes"
   git push
   ```

2. Test changes locally:
   ```bash
   netlify dev
   ```

3. Deploy to production:
   ```bash
   git checkout main
   git merge development
   git push
   ```

Netlify will automatically deploy changes pushed to the main branch.

## Features

- Real-time AI chat using Gemini API
- Dark/Light theme support
- File attachment support
- Voice input capability
- PWA support for mobile installation
- Automatic deployment through Netlify

## Environment Variables

Required environment variables:
- `GEMINI_API_KEY`: Your Google Gemini API key

### Setting up Environment Variables in Netlify

For the application to work properly when deployed to Netlify, you must set up the environment variables in the Netlify dashboard:

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Click "Add variable"
4. Enter `GEMINI_API_KEY` as the key and your API key as the value
5. Make sure to set this for both production and branch deploys
6. Click "Save"
7. Redeploy your site to apply the changes

If you encounter issues with the API key not being recognized:
- Verify that the environment variable is correctly set in Netlify
- Check the function logs in Netlify for any errors
- Try redeploying the site after setting the environment variable

## Technologies Used

- Vanilla JavaScript
- Google's Gemini AI API
- Netlify Functions
- Progressive Web App (PWA)
