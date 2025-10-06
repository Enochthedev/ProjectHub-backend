# Vector Database Infrastructure Setup

This document describes the vector database infrastructure implemented for the AI Assistant Enhancement project.

## Overview

The vector database infrastructure provides:

- **Vector storage and retrieval** using Qdrant
- **Embedding generation** with multiple model support
- **Automatic optimization** and indexing
- **Memory management** for conversations and user preferences
- **Institutional knowledge** integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vector Infrastructure                     │
├─────────────────────────────────────────────────────────────┤
│  VectorEmbeddingService  │  VectorDatabaseService           │
│  - Generate embeddings   │  - Store/retrieve vectors        │
│  - Batch processing      │  - Search similar vectors        │
│  - Specialized methods   │  - Collection management         │
├─────────────────────────────────────────────────────────────┤
│  VectorOptimizationService                                  │
│  - Automatic optimization                                   │
│  - Index management                                         │
│  - Performance monitoring                                   │
├─────────────────────────────────────────────────────────────┤
│                    Qdrant Vector Database                   │
│  Collections: conversations, user_memories,                 │
│              institutional_knowledge                        │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. VectorDatabaseService

Handles all vector database operations:

```typescript
// Store a vector
const vectorId = await vectorDb.storeVector('conversations', embedding, {
  userId: 'user-123',
  type: 'conversation',
});

// Search similar vectors
const results = await vectorDb.searchSimilar('conversations', queryVector, {
  limit: 10,
  scoreThreshold: 0.7,
});
```

### 2. VectorEmbeddingService

Generates embeddings with caching and optimization:

```typescript
// Generate single embedding
const result = await vectorEmbedding.generateEmbedding('User message text', {
  userId: 'user-123',
});

// Generate batch embeddings
const batchResult = await vectorEmbedding.generateBatchEmbeddings([
  'First message',
  'Second message',
  'Third message',
]);

// Specialized embeddings
const conversationEmbedding =
  await vectorEmbedding.generateConversationEmbedding(
    messages,
    conversationId,
    userId,
  );
```

### 3. VectorOptimizationService

Manages database optimization and performance:

```typescript
// Get optimization stats
const stats = await vectorOptimization.getOptimizationStats();

// Force optimization
const result = await vectorOptimization.optimizeAllCollections();
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Qdrant Vector Database Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_TIMEOUT=30000
QDRANT_RETRY_ATTEMPTS=3
QDRANT_RETRY_DELAY=1000
QDRANT_CONVERSATIONS_COLLECTION=conversations
QDRANT_USER_MEMORIES_COLLECTION=user_memories
QDRANT_INSTITUTIONAL_COLLECTION=institutional_knowledge
VECTOR_DIMENSIONS=384
QDRANT_DISTANCE_METRIC=Cosine
```

### Collections

The system creates three main collections:

1. **conversations** - Stores conversation embeddings for context retrieval
2. **user_memories** - Stores user preferences and interaction patterns
3. **institutional_knowledge** - Stores lecturer info, project topics, guidelines

## Setup Instructions

### 1. Start Qdrant Database

Using Docker Compose:

```bash
# Start Qdrant
docker-compose -f docker-compose.qdrant.yml up -d

# Check status
docker-compose -f docker-compose.qdrant.yml ps
```

### 2. Install Dependencies

```bash
npm install @qdrant/js-client-rest uuid
npm install --save-dev @types/uuid
```

### 3. Add to Application Module

```typescript
import { VectorModule } from './modules/vector.module';

@Module({
  imports: [
    // ... other modules
    VectorModule,
  ],
})
export class AppModule {}
```

### 4. Test Setup

Run the test to verify everything works:

```bash
# Minimal test (no Qdrant required)
npm run test:vector-minimal

# Full test (requires running Qdrant)
npm run test:vector-setup
```

## Usage Examples

### Storing Conversation Memory

```typescript
@Injectable()
export class ConversationService {
  constructor(
    private vectorEmbedding: VectorEmbeddingService,
    private vectorDb: VectorDatabaseService,
  ) {}

  async storeConversationMemory(
    messages: Message[],
    conversationId: string,
    userId: string,
  ) {
    // Generate embedding for conversation
    const embedding = await this.vectorEmbedding.generateConversationEmbedding(
      messages.map((m) => ({ role: m.role, content: m.content })),
      conversationId,
      userId,
    );

    // Store in vector database
    await this.vectorDb.storeVector('conversations', embedding.embedding, {
      conversationId,
      userId,
      messageCount: messages.length,
      lastMessageAt: new Date(),
      ...embedding.metadata,
    });
  }
}
```

### Retrieving Relevant Context

```typescript
async getRelevantContext(
  query: string,
  userId: string,
  limit: number = 5,
): Promise<ConversationContext[]> {
  // Generate query embedding
  const queryEmbedding = await this.vectorEmbedding.generateEmbedding(query);

  // Search for similar conversations
  const results = await this.vectorDb.searchSimilar(
    'conversations',
    queryEmbedding.embedding,
    {
      limit,
      scoreThreshold: 0.7,
      filter: { userId },
    },
  );

  return results.map(result => ({
    conversationId: result.payload.conversationId,
    similarity: result.score,
    context: result.payload.content,
  }));
}
```

### Storing User Preferences

```typescript
async storeUserPreference(
  userId: string,
  preference: string,
  category: 'communication' | 'technical' | 'learning',
) {
  const embedding = await this.vectorEmbedding.generateUserMemoryEmbedding(
    preference,
    userId,
    'preference',
    { category },
  );

  await this.vectorDb.storeVector(
    'user_memories',
    embedding.embedding,
    {
      userId,
      category,
      preference,
      ...embedding.metadata,
    },
  );
}
```

## Health Monitoring

### Health Check Endpoint

```typescript
@Get('vector/health')
async getVectorHealth() {
  return await this.vectorDb.getHealthStatus();
}
```

### Optimization Status

```typescript
@Get('vector/optimization')
async getOptimizationStatus() {
  return await this.vectorOptimization.getOptimizationStats();
}
```

## Performance Considerations

### Embedding Generation

- Uses caching to avoid regenerating embeddings
- Supports batch processing for efficiency
- Automatic fallback between local and API-based models

### Vector Storage

- Automatic indexing and optimization
- Configurable distance metrics (Cosine, Euclidean, Dot Product)
- Efficient filtering and search capabilities

### Memory Management

- Automatic cleanup of old vectors
- Configurable retention policies
- Memory usage monitoring

## Troubleshooting

### Common Issues

1. **Qdrant Connection Failed**

   ```bash
   # Check if Qdrant is running
   curl http://localhost:6333/health

   # Check Docker container
   docker-compose -f docker-compose.qdrant.yml logs qdrant
   ```

2. **Embedding Generation Errors**

   ```bash
   # Test embedding service
   npm run test:vector-minimal
   ```

3. **Collection Not Found**
   ```bash
   # Collections are created automatically on first use
   # Check collection status via health endpoint
   ```

### Performance Optimization

1. **Batch Processing**: Use batch embedding generation for multiple texts
2. **Caching**: Enable embedding caching to reduce API calls
3. **Indexing**: Run optimization regularly for better search performance
4. **Filtering**: Use payload filters to narrow search scope

## Migration and Backup

### Backup Collections

```bash
# Backup Qdrant data
docker exec qdrant-vector-db qdrant-backup create /qdrant/backups/backup-$(date +%Y%m%d)
```

### Collection Migration

```typescript
// Export collection data
const allVectors = await vectorDb.scrollVectors('old_collection', {
  limit: 1000,
});

// Import to new collection
await vectorDb.storeBatchVectors('new_collection', allVectors.points);
```

## Next Steps

1. **Integration**: Add VectorModule to your main application
2. **Testing**: Run comprehensive tests with actual Qdrant instance
3. **Monitoring**: Set up health checks and performance monitoring
4. **Scaling**: Configure Qdrant clustering for production use
5. **Security**: Add authentication and encryption for production deployment
