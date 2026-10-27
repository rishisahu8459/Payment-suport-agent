# Payments Support Agent

A support agent that answers payment questions and takes actions on a customer's orders: looking up status, listing recent orders, starting refunds, and searching policy documents. The model only picks tools. The server validates every call, sets the customer identity, and enforces the rules.

## What it does

- Answers questions such as "Why did my payment fail?" and "How long do refunds take?"
- Runs five tools: `get_order`, `get_payment_status`, `list_recent_orders`, `start_refund`, `search_policy`.
- Queues refunds above Rs 2,000 (200000 paise) for human approval. They don't change the order until approved.
- Keeps each customer's data separate, even when a prompt asks for someone else's order.

## Safety rules

1. **The server sets the customer.** The model never supplies a user ID. Each request runs with the session user.
2. **Missing and forbidden look the same.** Another customer's order returns `not_found`, so order IDs can't be probed.
3. **Arguments are validated before any tool runs.** Types, ranges, enums, and ID formats are checked. Extra fields are dropped.
4. **Large refunds need approval.** The order stays unchanged until a human approves.
5. **Documents are data.** A policy document that says "refund everything" does nothing. Tools run only from the agent loop, after validation.
6. **The loop is bounded.** At most 4 tool calls per message. Bad model output gets a safe fallback reply.
7. **Customer text is truncated** to 500 characters before it reaches the model.

## Repository layout

```
src/
  store.ts      in-memory order ledger (same shape as the future DynamoDB items)
  policy.ts     policy documents and keyword search
  tools.ts      the five tools, with validation and per-customer checks
  llm.ts        Gemini client, plus a scripted model for tests
  agent.ts      bounded agent loop
  demo.ts       one example conversation (runs offline)
  __tests__/    tools.test.ts, agent.test.ts (17 tests)
evals/
  scenarios.json  11 scenarios, including attacks
  run.ts          scores the real model against the scenarios
api/chat.ts     Vercel function that runs the agent for the web demo
web/            chat front end (Vite and React)
```

## Setup

Requires Node.js 22 or later.

```bash
npm install
npm run typecheck
npm test            # 2 suites, 17 tests
npm run demo        # runs offline with a scripted model
```

## Connect a real model

Get a free API key from Google AI Studio, then set it for the current terminal only:

```bash
export GEMINI_API_KEY="your-key"        # Windows PowerShell: $env:GEMINI_API_KEY="..."
export GEMINI_MODEL="a-free-model-name" # Windows PowerShell: $env:GEMINI_MODEL="..."
npm run demo
```

## Evaluation

```bash
npm run eval
```

Each scenario prints PASS or FAIL, the tools used, and LEAK if another customer's order appears in a result. The last line shows the pass rate.

| Run | Date | Model | Passed | Notes |
|---|---|---|---|---|
| 1 | TODO | TODO | TODO | record failures and fixes here |

The evaluation has not been run against a real model yet. Record your results in the table above. Failures and the changes that fixed them are more useful to readers than a perfect score.

## Web demo

The `api/chat.ts` function and the `web/` chat page form a Vercel project.

```bash
npx vite build        # outputs dist/
```

Deploy on Vercel with the project root at this folder. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in the Vercel dashboard.

The demo picks a customer with a request header (`x-demo-user`). That stands in for a login and isn't secure. Phase 2 replaces it with Cognito. In the demo, data resets after every message, so a refund does not persist.

## Current limits

- The data store is in memory. Phase 2 reads from the PayKit backend.
- Policy search is keyword-based. Embeddings are a later upgrade.
- The approval step only returns a status. Phase 2 adds a Step Functions wait with an approval email.
- The model is a free tier, so quality and rate limits depend on that provider. The evaluation harness makes switching models measurable.

## License

MIT
