import { getAnalysisProvider } from './ai';

describe('AI provider selection', () => {
  it('uses only the selected provider key', () => {
    expect(JSON.stringify(getAnalysisProvider({ aiProvider: 'qwen', qwenApiKey: 'qwen-key', deepseekApiKey: 'deepseek-key' }))).toBe(JSON.stringify({ provider: 'qwen', apiKey: 'qwen-key' }));
    expect(JSON.stringify(getAnalysisProvider({ aiProvider: 'deepseek', qwenApiKey: 'qwen-key', deepseekApiKey: 'deepseek-key' }))).toBe(JSON.stringify({ provider: 'deepseek', apiKey: 'deepseek-key' }));
  });

  it('does not fall back to another provider when the selected key is missing', () => {
    expect(getAnalysisProvider({ aiProvider: 'qwen', deepseekApiKey: 'deepseek-key' })).toBe(null);
    expect(getAnalysisProvider({ aiProvider: 'deepseek', qwenApiKey: 'qwen-key' })).toBe(null);
  });
});
