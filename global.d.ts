declare module '@google/generative-ai' {
  export interface GenerativeModel {
    generateContent(request: any): Promise<{ response: { text(): string } }>;
    generateContentStream?(
      request: any
    ): Promise<AsyncIterable<any> | { stream: AsyncIterable<any> }>;
  }

  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string; generationConfig?: any }): GenerativeModel;
  }
}
