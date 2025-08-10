const { GoogleGenAI } = require('@google/genai');

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GoogleGenAI({ apiKey });
}

async function streamChat(contents, onDelta) {
  const client = createGeminiClient();
  const response = await client.models.generateContentStream({
    model: 'gemini-2.0-flash-lite',
    config: {},
    contents,
  });

  for await (const chunk of response) {
    if (chunk && typeof chunk.text === 'string' && chunk.text.length > 0) {
      onDelta(chunk.text);
    }
  }
}

module.exports = { streamChat };


