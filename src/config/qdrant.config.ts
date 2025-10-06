import { registerAs } from '@nestjs/config';

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  collections: {
    conversations: string;
    userMemories: string;
    institutionalKnowledge: string;
  };
  vectorDimensions: number;
  distanceMetric: 'Cosine' | 'Euclid' | 'Dot';
}

export default registerAs(
  'qdrant',
  (): QdrantConfig => ({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    timeout: parseInt(process.env.QDRANT_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.QDRANT_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.QDRANT_RETRY_DELAY || '1000', 10),
    collections: {
      conversations:
        process.env.QDRANT_CONVERSATIONS_COLLECTION || 'conversations',
      userMemories:
        process.env.QDRANT_USER_MEMORIES_COLLECTION || 'user_memories',
      institutionalKnowledge:
        process.env.QDRANT_INSTITUTIONAL_COLLECTION ||
        'institutional_knowledge',
    },
    vectorDimensions: parseInt(process.env.VECTOR_DIMENSIONS || '384', 10), // all-MiniLM-L6-v2 default
    distanceMetric:
      (process.env.QDRANT_DISTANCE_METRIC as 'Cosine' | 'Euclid' | 'Dot') ||
      'Cosine',
  }),
);
