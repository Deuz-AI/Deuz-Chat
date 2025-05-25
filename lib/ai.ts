import { deepseek } from '@ai-sdk/deepseek';

export const deepseekApi = deepseek('deepseek-chat', {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const deepseekModel = 'deepseek-chat'; 