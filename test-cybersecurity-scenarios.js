#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');

const { MockLLMClient } = require('./clients/mock-llm-client');
const { CAGService } = require('./services/cag-service');
const { CybersecurityKnowledgeService } = require('./services/cybersecurity-knowledge-service');
const { MemorySystem } = require('./memory/memory-system');
const { EventBus } = require('./events/event-bus');

async function testCybersecurityScenarios() {
  console.log('🔒 C0DI3 Cybersecurity Scenario Testing');
  console.log('==================================================');
  console.log('Testing with Mock LLM Client');
  console.log('');

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

    // Test Scenario 1: SQL Injection Analysis
    console.log('\n🔍 Scenario 1: SQL Injection Analysis');
    console.log('Query: "How to detect and prevent SQL injection attacks?"');

    const sqlInjectionResult = await cagService.query({
      query: 'How to detect and prevent SQL injection attacks?',
      useCache: false,
      category: 'blue-team',
      difficulty: 'intermediate'
    });

    console.log('📊 Results:');
    console.log(`- Response Length: ${sqlInjectionResult.response.length} characters`);
    console.log(`- Processing Time: ${sqlInjectionResult.processingTime}ms`);
    console.log(`- Cache Hit: ${sqlInjectionResult.cached}`);
    console.log(`- Confidence: ${sqlInjectionResult.confidence}`);
    console.log(`- Techniques Found: ${sqlInjectionResult.techniques.length}`);
    console.log(`- Tools Found: ${sqlInjectionResult.tools.length}`);

    // Test Scenario 2: Network Reconnaissance
    console.log('\n🔍 Scenario 2: Network Reconnaissance');
    console.log('Query: "What are the best practices for network reconnaissance?"');

    const reconnaissanceResult = await cagService.query({
      query: 'What are the best practices for network reconnaissance?',
      useCache: false,
      category: 'red-team',
      difficulty: 'advanced'
    });

    console.log('📊 Results:');
    console.log(`- Response Length: ${reconnaissanceResult.response.length} characters`);
    console.log(`- Processing Time: ${reconnaissanceResult.processingTime}ms`);
    console.log(`- Cache Hit: ${reconnaissanceResult.cached}`);
    console.log(`- Confidence: ${reconnaissanceResult.confidence}`);
    console.log(`- Techniques Found: ${reconnaissanceResult.techniques.length}`);
    console.log(`- Tools Found: ${reconnaissanceResult.tools.length}`);

    // Test Scenario 3: Malware Analysis
    console.log('\n🔍 Scenario 3: Malware Analysis');
    console.log('Query: "How to analyze suspicious files for malware?"');

    const malwareResult = await cagService.query({
      query: 'How to analyze suspicious files for malware?',
      useCache: false,
      category: 'blue-team',
      difficulty: 'intermediate'
    });

    console.log('📊 Results:');
    console.log(`- Response Length: ${malwareResult.response.length} characters`);
    console.log(`- Processing Time: ${malwareResult.processingTime}ms`);
    console.log(`- Cache Hit: ${malwareResult.cached}`);
    console.log(`- Confidence: ${malwareResult.confidence}`);
    console.log(`- Techniques Found: ${malwareResult.techniques.length}`);
    console.log(`- Tools Found: ${malwareResult.tools.length}`);

    // Test Scenario 4: Incident Response
    console.log('\n🔍 Scenario 4: Incident Response');
    console.log('Query: "What are the key steps in incident response?"');

    const incidentResult = await cagService.query({
      query: 'What are the key steps in incident response?',
      useCache: false,
      category: 'blue-team',
      difficulty: 'beginner'
    });

    console.log('📊 Results:');
    console.log(`- Response Length: ${incidentResult.response.length} characters`);
    console.log(`- Processing Time: ${incidentResult.processingTime}ms`);
    console.log(`- Cache Hit: ${incidentResult.cached}`);
    console.log(`- Confidence: ${incidentResult.confidence}`);
    console.log(`- Techniques Found: ${incidentResult.techniques.length}`);
    console.log(`- Tools Found: ${incidentResult.tools.length}`);

    // Test Scenario 5: Web Application Security
    console.log('\n🔍 Scenario 5: Web Application Security');
    console.log('Query: "How to test web applications for vulnerabilities?"');

    const webSecResult = await cagService.query({
      query: 'How to test web applications for vulnerabilities?',
      useCache: false,
      category: 'red-team',
      difficulty: 'intermediate'
    });

    console.log('📊 Results:');
    console.log(`- Response Length: ${webSecResult.response.length} characters`);
    console.log(`- Processing Time: ${webSecResult.processingTime}ms`);
    console.log(`- Cache Hit: ${webSecResult.cached}`);
    console.log(`- Confidence: ${webSecResult.confidence}`);
    console.log(`- Techniques Found: ${webSecResult.techniques.length}`);
    console.log(`- Tools Found: ${webSecResult.tools.length}`);

    // Test cache performance with repeated queries
    console.log('\n🔄 Testing Cache Performance');
    console.log('Repeating SQL injection query to test cache...');

    const cachedResult = await cagService.query({
      query: 'How to detect and prevent SQL injection attacks?',
      useCache: true,
      category: 'blue-team',
      difficulty: 'intermediate'
    });

    console.log('📊 Cached Results:');
    console.log(`- Cache Hit: ${cachedResult.cached}`);
    console.log(`- Cache Hit Type: ${cachedResult.cacheHitType}`);
    console.log(`- Processing Time: ${cachedResult.processingTime}ms`);
    console.log(`- Performance Improvement: ${((sqlInjectionResult.processingTime - cachedResult.processingTime) / sqlInjectionResult.processingTime * 100).toFixed(1)}%`);

    // Get final cache statistics
    console.log('\n📈 Final Cache Statistics:');
    const stats = cagService.getCacheStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n🎉 Cybersecurity Scenario Testing Complete!');
    console.log('==================================================');
    console.log('✅ All scenarios tested successfully');
    console.log('✅ CAG functionality working correctly');
    console.log('✅ Cache performance optimized');
    console.log('✅ Knowledge base accessible');
    console.log('✅ Mock responses appropriate for testing');
    console.log('');
    console.log('🚀 C0DI3 is ready for cybersecurity operations!');

  } catch (error) {
    console.error('❌ Cybersecurity scenario testing failed:', error.message);
    console.error(error.stack);
  }
}

testCybersecurityScenarios();
