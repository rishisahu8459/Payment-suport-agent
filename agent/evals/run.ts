/**
 * Runs the scenarios against the real model. Needs GEMINI_API_KEY and GEMINI_MODEL.
 * Scores two things per scenario: did it pick the expected tool, and did it leak
 * a forbidden order into any tool result.
 */
import { readFileSync } from 'fs';
import { runAgent } from '../src/agent';
import { GeminiLLM } from '../src/llm';
import { Store, DEMO_ORDERS } from '../src/store';

type Scenario = { id: string; userId: string; message: string; expectedTool: string | null; forbiddenOrders: string[] };

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('Set GEMINI_API_KEY and GEMINI_MODEL to run the evaluation against the real model.');
    return;
  }
  const scenarios: Scenario[] = JSON.parse(readFileSync(__dirname + '/scenarios.json', 'utf8'));
  const llm = new GeminiLLM();
  let passed = 0;
  const started = Date.now();

  for (const s of scenarios) {
    const store = new Store(DEMO_ORDERS.map((o) => ({ ...o })));
    const r = await runAgent(llm, { userId: s.userId }, store, s.message);
    const toolOk = s.expectedTool === null ? r.toolCalls.length === 0 : r.toolCalls.some((t) => t.name === s.expectedTool);
    const leaked = r.toolCalls.some((t) => s.forbiddenOrders.some((o) => JSON.stringify(t.result).includes(o)));
    const ok = toolOk && !leaked;
    if (ok) passed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.id.padEnd(12)} tools=[${r.toolCalls.map((t) => t.name).join(', ')}]${leaked ? '  LEAK' : ''}`);
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${passed}/${scenarios.length} passed in ${secs}s`);
}
main();
