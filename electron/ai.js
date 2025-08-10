const { GoogleGenAI } = require('@google/genai');

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GoogleGenAI({ apiKey });
}

async function generateStreamingText(promptText) {
  const client = createGeminiClient();
  const response = await client.models.generateContentStream({
    model: 'gemini-2.0-flash-lite',
    config: {},
    contents: [
      { role: 'user', parts: [{ text: promptText }] },
    ],
  });

  let text = '';
  for await (const chunk of response) {
    if (chunk && typeof chunk.text === 'string') {
      text += chunk.text;
    }
  }
  return text;
}

module.exports = { generateStreamingText };


