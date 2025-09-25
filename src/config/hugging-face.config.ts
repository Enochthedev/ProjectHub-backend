import { registerAs } from '@nestjs/config';

export default registerAs('huggingFace', () => ({
  apiKey: process.env.HUGGING_FACE_API_KEY,
  model:
    process.env.HUGGING_FACE_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
  qaModel:
    process.env.HUGGING_FACE_QA_MODEL ||
    'distilbert-base-cased-distilled-squad',
  timeout: parseInt(process.env.HUGGING_FACE_TIMEOUT || '15000', 10),
  maxRetries: parseInt(process.env.HUGGING_FACE_MAX_RETRIES || '3', 10),
  qaMaxContextLength: parseInt(
    process.env.HUGGING_FACE_QA_MAX_CONTEXT_LENGTH || '512',
    10,
  ),
  qaMaxAnswerLength: parseInt(
    process.env.HUGGING_FACE_QA_MAX_ANSWER_LENGTH || '200',
    10,
  ),
  qaConfidenceThreshold: parseFloat(
    process.env.HUGGING_FACE_QA_CONFIDENCE_THRESHOLD || '0.3',
  ),
}));
