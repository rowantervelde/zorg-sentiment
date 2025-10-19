/**
 * Type declarations for sentiment library
 */

declare module 'sentiment' {
  interface AnalysisResult {
    score: number;
    comparative: number;
    calculation: Array<{ [word: string]: number }>;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  interface SentimentOptions {
    extras?: { [word: string]: number };
  }

  class Sentiment {
    constructor();
    analyze(phrase: string, options?: SentimentOptions): AnalysisResult;
    registerLanguage(languageCode: string, language: { labels: { [word: string]: number } }): void;
  }

  export = Sentiment;
}
