import { GemmaAgent } from '../gemma3n:4B-agent';

describe('Integration: Agent end-to-end', () => {
  it('should generate a real response from llama.cpp', async () => {
    const agent = new GemmaAgent();
    const prompt = 'What is the capital of France?';
    const response = await agent.process(prompt);
    expect(typeof response.text === 'string' && response.text.length > 0).toBe(true);
    expect(Array.isArray(response.reasoning)).toBe(true);
    expect(response.performance).toBeDefined();
    expect(response.memory).toBeDefined();
    console.log('Agent response:', response.text);
  });

  it('should handle an invalid prompt gracefully', async () => {
    const agent = new GemmaAgent();
    await expect(agent.process('')).rejects.toThrow();
  });

  it('should expose tool calls and memory state', async () => {
    const agent = new GemmaAgent();
    // Simulate a prompt that triggers a tool (if any tools are registered)
    const prompt = 'Use a tool to calculate 2+2.';
    const response = await agent.process(prompt);
    expect(response.toolCalls).toBeDefined();
    expect(response.memory).toBeDefined();
  });
});
