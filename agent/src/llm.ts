export interface LLM {
  complete(prompt: string): Promise<string>;
}

/** Free-tier Gemini via the REST API. Set GEMINI_API_KEY and GEMINI_MODEL. */
export class GeminiLLM implements LLM {
  constructor(private apiKey = process.env.GEMINI_API_KEY ?? '', private model = process.env.GEMINI_MODEL ?? '') {
    if (!this.apiKey || !this.model) throw new Error('Set GEMINI_API_KEY and GEMINI_MODEL');
  }
  async complete(prompt: string): Promise<string> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 300 } }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`LLM status ${res.status}`);
    const data: any = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}

/** Returns queued replies in order. Used by tests and offline evals. */
export class ScriptedLLM implements LLM {
  private i = 0;
  constructor(private replies: string[]) {}
  async complete(): Promise<string> {
    return this.replies[this.i++] ?? '{"answer":"(no more scripted replies)"}';
  }
}
