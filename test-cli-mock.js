#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');

// Override the LlamaCppClient with MockLLMClient for testing
const { MockLLMClient } = require('./clients/mock-llm-client');
const originalRequire = require;
require = function(id) {
  if (id === './clients/llama-cpp-client') {
    return { LlamaCppClient: MockLLMClient };
  }
  return originalRequire.apply(this, arguments);
};

const { GemmaAgent } = require('./gemma3n:4B-agent');

async function testCLIWithMock() {
  console.log('🚀 Testing CLI with Mock LLM Client');
  console.log('==================================================');

  try {
    // Initialize agent with mock client
    const agent = new GemmaAgent();
    console.log('✅ Agent initialized with mock client');

    // Test health check
    console.log('\n🏥 Testing Health Check:');
    const healthMetrics = agent.getPerformanceMetrics();
    console.log('Performance Metrics:', JSON.stringify(healthMetrics, null, 2));

    // Test cybersecurity knowledge query
    console.log('\n🔍 Testing Cybersecurity Knowledge Query:');
    const knowledgeResult = await agent.queryCybersecurityKnowledge('SQL injection', {
      maxResults: 3,
      includeCode: true,
      includeTechniques: true
    });
    console.log('Knowledge Result:', JSON.stringify(knowledgeResult, null, 2));

    // Test CAG functionality
    console.log('\n⚡ Testing CAG Query:');
    const cagResult = await agent.queryCybersecurityKnowledgeCAG('What is network scanning?', {
      maxResults: 2,
      includeCode: true
    });
    console.log('CAG Result:', JSON.stringify(cagResult, null, 2));

    // Test cache stats
    console.log('\n📈 CAG Cache Statistics:');
    const cacheStats = agent.getCAGCacheStats();
    console.log('Cache Stats:', JSON.stringify(cacheStats, null, 2));

    console.log('\n✅ CLI mock test completed successfully!');

  } catch (error) {
    console.error('❌ CLI mock test failed:', error.message);
    console.error(error.stack);
  }
}

testCLIWithMock();
