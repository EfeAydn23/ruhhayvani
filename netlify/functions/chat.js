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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'no key' }) };

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: system || '' }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 1.0 }
    });

    return new Promise((resolve) => {
      const path = `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          console.log('Gemini raw:', data.substring(0, 500));
          try {
            const geminiResp = JSON.parse(data);
            // Anthropic formatına çevir ki HTML değişmesin
            const text = geminiResp.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const anthropicFormat = {
              content: [{ type: 'text', text }]
            };
            resolve({ statusCode: 200, headers, body: JSON.stringify(anthropicFormat) });
          } catch(e) {
            resolve({ statusCode: 500, headers, body: JSON.stringify({ error: 'parse error' }) });
          }
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
