#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { VectorModule } from '../src/modules/vector.module';
import { VectorDatabaseService } from '../src/services/vector-database.service';
import { VectorEmbeddingService } from '../src/services/vector-embedding.service';
import qdrantConfig from '../src/config/qdrant.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [qdrantConfig],
      isGlobal: true,
    }),
    VectorModule,
  ],
})
class TestModule {}

async function testVectorSetup() {
  console.log('🚀 Testing Vector Database Setup...\n');

  try {
    // Create NestJS application
    const app = await NestFactory.createApplicationContext(TestModule);

    const vectorDb = app.get(VectorDatabaseService);
    const vectorEmbedding = app.get(VectorEmbeddingService);

    console.log('✅ Services initialized successfully');

    // Test 1: Health Check
    console.log('\n📊 Testing health status...');
    try {
      const health = await vectorDb.getHealthStatus();
      console.log(`   Status: ${health.status}`);
      console.log(`   Collections: ${health.collections.join(', ')}`);
      console.log(`   Total Vectors: ${health.totalVectors}`);
    } catch (error) {
      console.log(
        `   ⚠️  Health check failed (expected if Qdrant not running): ${error.message}`,
      );
    }

    // Test 2: Embedding Generation
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
        `   Metadata: ${JSON.stringify(embedding.metadata, null, 2)}`,
      );
    } catch (error) {
      console.log(`   ❌ Embedding generation failed: ${error.message}`);
    }

    // Test 3: Batch Embedding Generation
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

    // Test 4: Specialized Embeddings
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

    // Test 5: Vector Operations (if Qdrant is running)
    console.log('\n🔍 Testing vector database operations...');
    try {
      const testVector = new Array(384).fill(0).map(() => Math.random());
      const testPayload = {
        type: 'test',
        content: 'Test vector for database operations',
        userId: 'test-user',
      };

      // Try to store a vector
      const vectorId = await vectorDb.storeVector(
        'test_collection',
        testVector,
        testPayload,
      );
      console.log(`   ✅ Stored vector with ID: ${vectorId}`);

      // Try to retrieve the vector
      const retrievedVector = await vectorDb.getVector(
        'test_collection',
        vectorId,
        true,
      );
      if (retrievedVector) {
        console.log(`   ✅ Retrieved vector: ${retrievedVector.id}`);
        console.log(`   Payload: ${JSON.stringify(retrievedVector.payload)}`);
      }

      // Try to search for similar vectors
      const searchResults = await vectorDb.searchSimilar(
        'test_collection',
        testVector,
        {
          limit: 5,
          scoreThreshold: 0.5,
        },
      );
      console.log(`   ✅ Found ${searchResults.length} similar vectors`);

      // Clean up
      await vectorDb.deleteVector('test_collection', vectorId);
      console.log(`   ✅ Cleaned up test vector`);
    } catch (error) {
      console.log(
        `   ⚠️  Vector operations failed (expected if Qdrant not running): ${error.message}`,
      );
    }

    console.log('\n🎉 Vector database setup test completed!');
    console.log('\n📝 Next steps:');
    console.log(
      '   1. Start Qdrant: docker-compose -f docker-compose.qdrant.yml up -d',
    );
    console.log('   2. Update your .env file with Qdrant configuration');
    console.log('   3. Run this test again to verify full functionality');

    await app.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testVectorSetup().catch(console.error);
