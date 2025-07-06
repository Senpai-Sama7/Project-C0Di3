#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');

const { GemmaAgent } = require('./gemma3n:4B-agent');

async function testNaturalLanguageInterface() {
  console.log('🤖 Testing Natural Language Interface');
  console.log('=====================================');

  try {
    // Initialize agent
    const agent = new GemmaAgent();
    console.log('✅ Agent initialized successfully');

    // Test natural language requests
    const testRequests = [
      'Check system health',
      'List available tools',
      'Explain SQL injection',
      'What is network reconnaissance?',
      'How do I detect malware?'
    ];

    for (const request of testRequests) {
      console.log(`\n🔄 Testing: "${request}"`);
      try {
        const response = await agent.process(request, {
          strategy: 'auto',
          maxSteps: 3
        });
        console.log(`📝 Response: ${response.text || response}`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    console.log('\n✅ Natural language interface test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure llama.cpp server is running:');
    console.log('1. Start llama.cpp server');
    console.log('2. Check LLM_API_URL in .env');
    console.log('3. Run: ./start-services.sh');
  }
}

testNaturalLanguageInterface();
