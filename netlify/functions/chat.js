const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { system, message } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'no key' }) };

    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: system || '',
      messages: [{ role: 'user', content: message }],
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: 200, headers, body: data });
        });
      });

      req.on('error', (e) => {
        resolve({ statusCode: 500, headers, body: JSON.stringify({ error: e.message }) });
      });

      req.write(body);
      req.end();
    });

  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
