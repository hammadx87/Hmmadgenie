// This function will handle the OAuth callback from Supabase
exports.handler = async (event, context) => {
  // The token and type are passed as query parameters
  const { access_token, refresh_token, expires_in, token_type } = event.queryStringParameters;
  
  // Set cookies for the session
  const cookies = [
    `sb-access-token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    `sb-token-expires=${expires_in}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    `sb-token-type=${token_type}; Path=/; HttpOnly; Secure; SameSite=Lax`
  ];

  // Redirect to the main app with the tokens
  return {
    statusCode: 302,
    headers: {
      'Set-Cookie': cookies,
      'Location': '/',
      'Cache-Control': 'no-cache'
    },
    body: ''
  };
};
