#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');

const { GemmaAgent } = require('./gemma3n:4B-agent');

async function testCAG() {
  console.log('🚀 Testing Cache-Augmented Generation (CAG)');
  console.log('='.repeat(50));

  try {
    // Initialize the agent
    const agent = new GemmaAgent();
    console.log('✅ Agent initialized');

    // Test queries
    const testQueries = [
      "What is SQL injection?",
      "How to detect network reconnaissance?",
      "What are the OWASP Top 10 vulnerabilities?",
      "How to perform penetration testing?",
      "What is lateral movement in cybersecurity?"
    ];

    console.log('\n📊 Running CAG Performance Test');
    console.log('-'.repeat(30));

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`\n🔍 Query ${i + 1}: "${query}"`);

      const startTime = Date.now();
      const result = await agent.queryCybersecurityKnowledgeCAG(query, {
        includeCode: true,
        includeTechniques: true
      });
      const endTime = Date.now();

      console.log(`⏱️  Response Time: ${endTime - startTime}ms`);
      console.log(`💾 Cached: ${result.cached ? '✅ Yes' : '❌ No'}`);
      console.log(`🎯 Cache Hit Type: ${result.cacheHitType}`);
      console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%`);

      if (result.similarityScore) {
        console.log(`🔗 Similarity Score: ${(result.similarityScore * 100).toFixed(1)}%`);
      }

      console.log(`📝 Response Preview: ${result.response.substring(0, 100)}...`);
    }

    // Show cache statistics
    console.log('\n📊 Cache Statistics');
    console.log('-'.repeat(30));
    const stats = agent.getCAGCacheStats();
    console.log(`Total Queries: ${stats.totalQueries}`);
    console.log(`Cache Hits: ${stats.hits}`);
    console.log(`Cache Misses: ${stats.misses}`);
    console.log(`Hit Rate: ${stats.hitRate}`);
    console.log(`Cache Size: ${stats.cacheSize} entries`);

    // Test cache persistence
    console.log('\n💾 Testing Cache Export/Import');
    console.log('-'.repeat(30));

    const cacheData = agent.exportCAGCache();
    console.log(`✅ Exported ${Object.keys(cacheData.cache).length} cache entries`);

    agent.clearCAGCache();
    console.log('🗑️  Cache cleared');

    agent.importCAGCache(cacheData);
    console.log('📥 Cache imported');

    const newStats = agent.getCAGCacheStats();
    console.log(`📊 New cache size: ${newStats.cacheSize} entries`);

    console.log('\n✅ CAG Test Completed Successfully!');
    console.log('\n💡 Tips:');
    console.log('- Use "core-agent cag:prewarm" to pre-load common queries');
    console.log('- Use "core-agent cag:stats" to monitor performance');
    console.log('- Use "core-agent cag:clear" to reset cache when needed');

  } catch (error) {
    console.error('❌ CAG test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCAG();
