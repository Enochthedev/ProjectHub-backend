#!/usr/bin/env ts-node

import { ConfigService } from '@nestjs/config';
import { VectorDatabaseService } from '../src/services/vector-database.service';
import { VectorEmbeddingService } from '../src/services/vector-embedding.service';
import { VectorOptimizationService } from '../src/services/vector-optimization.service';

// Mock config service
const mockConfigService = {
  get: (key: string) => {
    if (key === 'qdrant') {
      return {
        url: 'http://localhost:6333',
        apiKey: undefined,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        collections: {
          conversations: 'conversations',
          userMemories: 'user_memories',
          institutionalKnowledge: 'institutional_knowledge',
        },
        vectorDimensions: 384,
        distanceMetric: 'Cosine',
      };
    }
    return undefined;
  },
} as ConfigService;

// Mock embedding service
const mockEmbeddingService = {
  generateSingleEmbedding: async (text: string) => {
    return new Array(384).fill(0).map(() => Math.random());
  },
  generateEmbeddings: async (texts: string[]) => {
    return {
      embeddings: texts.map(() =>
        new Array(384).fill(0).map(() => Math.random()),
      ),
      fromCache: texts.map(() => false),
      totalTokens: texts.length * 10,
      cacheHits: 0,
      cacheMisses: texts.length,
    };
  },
  getCacheStats: async () => ({
    totalCachedEmbeddings: 0,
    cacheHitRate: 0,
    averageEmbeddingSize: 384,
  }),
};

async function testVectorSetupMinimal() {
  console.log('🚀 Testing Vector Database Setup (Minimal)...\n');

  try {
    // Test 1: Vector Database Service Initialization
    console.log('📊 Testing VectorDatabaseService initialization...');
    const vectorDb = new VectorDatabaseService(mockConfigService);
    console.log('   ✅ VectorDatabaseService created successfully');

    // Test 2: Vector Embedding Service Initialization
    console.log('\n🧠 Testing VectorEmbeddingService initialization...');
    const vectorEmbedding = new VectorEmbeddingService(
      mockConfigService,
      mockEmbeddingService as any,
    );
    console.log('   ✅ VectorEmbeddingService created successfully');

    // Test 3: Vector Optimization Service Initialization
    console.log('\n⚡ Testing VectorOptimizationService initialization...');
    const vectorOptimization = new VectorOptimizationService(
      mockConfigService,
      vectorDb,
    );
    console.log('   ✅ VectorOptimizationService created successfully');

    // Test 4: Embedding Generation
    console.log('\n🧠 Testing embedding generation...');
    try {
      const testText = 'This is a test message for vector embedding';
      const embedding = await vectorEmbedding.generateEmbedding(testText, {
        type: 'test',
        userId: 'test-user',
      });

      console.log(
        `   ✅ Generated embedding with ${embedding.embedding.length} dimensions`,
      );
      console.log(`   Text: "${embedding.text}"`);
      console.log(
        `   Metadata keys: ${Object.keys(embedding.metadata || {}).join(', ')}`,
      );

      // Verify normalization
      const magnitude = Math.sqrt(
        embedding.embedding.reduce((sum, val) => sum + val * val, 0),
      );
      console.log(
        `   Vector magnitude: ${magnitude.toFixed(6)} (should be ~1.0 if normalized)`,
      );
    } catch (error) {
      console.log(`   ❌ Embedding generation failed: ${error.message}`);
    }

    // Test 5: Batch Embedding Generation
    console.log('\n📦 Testing batch embedding generation...');
    try {
      const testTexts = [
        'First test message',
        'Second test message',
        'Third test message',
      ];

      const batchResult =
        await vectorEmbedding.generateBatchEmbeddings(testTexts);

      console.log(
        `   ✅ Generated ${batchResult.embeddings.length} embeddings`,
      );
      console.log(`   Total tokens: ${batchResult.totalTokens}`);
      console.log(`   Cache hits: ${batchResult.cacheHits}`);
      console.log(`   Cache misses: ${batchResult.cacheMisses}`);
      console.log(`   Processing time: ${batchResult.processingTime}ms`);
    } catch (error) {
      console.log(`   ❌ Batch embedding generation failed: ${error.message}`);
    }

    // Test 6: Specialized Embeddings
    console.log('\n🎯 Testing specialized embedding methods...');
    try {
      // Conversation embedding
      const conversationEmbedding =
        await vectorEmbedding.generateConversationEmbedding(
          [
            { role: 'user', content: 'Hello, I need help with my project' },
            {
              role: 'assistant',
              content:
                "I'd be happy to help! What specific area do you need assistance with?",
            },
          ],
          'conv-123',
          'user-456',
        );
      console.log(
        `   ✅ Conversation embedding: ${conversationEmbedding.embedding.length} dimensions`,
      );

      // User memory embedding
      const memoryEmbedding = await vectorEmbedding.generateUserMemoryEmbedding(
        'User prefers detailed technical explanations',
        'user-456',
        'preference',
      );
      console.log(
        `   ✅ User memory embedding: ${memoryEmbedding.embedding.length} dimensions`,
      );

      // Institutional embedding
      const institutionalEmbedding =
        await vectorEmbedding.generateInstitutionalEmbedding(
          'Dr. Smith specializes in machine learning and AI research',
          'lecturer',
        );
      console.log(
        `   ✅ Institutional embedding: ${institutionalEmbedding.embedding.length} dimensions`,
      );
    } catch (error) {
      console.log(
        `   ❌ Specialized embedding generation failed: ${error.message}`,
      );
    }

    // Test 7: Vector Utility Functions
    console.log('\n🔧 Testing vector utility functions...');
    try {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const vectorC = [1, 0, 0];

      const similarity1 = vectorEmbedding.calculateCosineSimilarity(
        vectorA,
        vectorB,
      );
      const similarity2 = vectorEmbedding.calculateCosineSimilarity(
        vectorA,
        vectorC,
      );

      console.log(
        `   ✅ Cosine similarity (orthogonal): ${similarity1.toFixed(6)} (should be ~0.0)`,
      );
      console.log(
        `   ✅ Cosine similarity (identical): ${similarity2.toFixed(6)} (should be ~1.0)`,
      );

      // Test validation
      const validEmbedding = new Array(384).fill(0.1);
      const invalidEmbedding = new Array(256).fill(0.1);

      console.log(
        `   ✅ Valid embedding validation: ${vectorEmbedding.validateEmbedding(validEmbedding)}`,
      );
      console.log(
        `   ✅ Invalid embedding validation: ${vectorEmbedding.validateEmbedding(invalidEmbedding)}`,
      );
    } catch (error) {
      console.log(`   ❌ Vector utility functions failed: ${error.message}`);
    }

    // Test 8: Configuration Validation
    console.log('\n⚙️  Testing configuration...');
    try {
      const config = mockConfigService.get('qdrant');
      console.log(`   ✅ Qdrant URL: ${config.url}`);
      console.log(`   ✅ Vector dimensions: ${config.vectorDimensions}`);
      console.log(`   ✅ Distance metric: ${config.distanceMetric}`);
      console.log(
        `   ✅ Collections: ${Object.values(config.collections).join(', ')}`,
      );
    } catch (error) {
      console.log(`   ❌ Configuration validation failed: ${error.message}`);
    }

    console.log('\n🎉 Vector database setup test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log(
      '   1. Start Qdrant: docker-compose -f docker-compose.qdrant.yml up -d',
    );
    console.log('   2. Update your .env file with Qdrant configuration');
    console.log('   3. Test with actual Qdrant connection using the full test');
    console.log('   4. Add the VectorModule to your main application module');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testVectorSetupMinimal().catch(console.error);
