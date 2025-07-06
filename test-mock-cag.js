#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');

const { MockLLMClient } = require('./clients/mock-llm-client');
const { CAGService } = require('./services/cag-service');
const { CybersecurityKnowledgeService } = require('./services/cybersecurity-knowledge-service');
const { MemorySystem } = require('./memory/memory-system');
const { EventBus } = require('./events/event-bus');

async function testMockCAG() {
  console.log('🚀 Testing Mock CAG System');
  console.log('==================================================');

  try {
    // Initialize components
    const eventBus = new EventBus();
    const memory = new MemorySystem({
      vectorStoreType: 'inmemory',
      eventBus: eventBus
    });

    const mockClient = new MockLLMClient();
    const knowledgeService = new CybersecurityKnowledgeService(memory, mockClient, eventBus);
    const cagService = new CAGService(mockClient, knowledgeService, eventBus);

    console.log('✅ Components initialized');

    // Test CAG query
    console.log('\n🔍 Testing CAG Query: "What is SQL injection?"');
    const result = await cagService.query({
      query: 'What is SQL injection?',
      useCache: false
    });

    console.log('📊 CAG Result:');
    console.log(`Response: ${result.response}`);
    console.log(`Cached: ${result.cached}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    console.log(`Cache Hit Type: ${result.cacheHitType}`);

    // Test cache functionality
    console.log('\n🔄 Testing cache functionality...');
    const cachedResult = await cagService.query({
      query: 'What is SQL injection?',
      useCache: true
    });

    console.log('📊 Cached Result:');
    console.log(`Cached: ${cachedResult.cached}`);
    console.log(`Cache Hit Type: ${cachedResult.cacheHitType}`);

    // Test cache stats
    console.log('\n📈 Cache Statistics:');
    const stats = cagService.getCacheStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n✅ Mock CAG test completed successfully!');

  } catch (error) {
    console.error('❌ Mock CAG test failed:', error.message);
    console.error(error.stack);
  }
}

testMockCAG();
