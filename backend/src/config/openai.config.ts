import { registerAs } from '@nestjs/config';

/**
 * OpenAI Configuration
 * Per FR-023 to FR-025: AI autocompletion for SOAP notes with PHI de-identification
 */
export default registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
}));
