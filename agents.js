'use strict';

/* Supervisor / sub-agent graph built on LangGraph.
 *
 *            ┌─────────────┐
 *   START ──▶│  supervisor │  reads the problem, decides which
 *            └──────┬──────┘  specialists to engage and what to ask each
 *         ┌─────────┼─────────┐
 *         ▼         ▼         ▼        (fan-out, run concurrently)
 *   feasibility  approach  deployment
 *         └─────────┼─────────┘
 *                   ▼
 *            ┌─────────────┐
 *            │ synthesiser │ ──▶ END
 *            └─────────────┘
 *
 * The task — scoping an AI project against a measurable target — mirrors
 * step one of a real QVisionX engagement, so the demo performs the method
 * rather than describing it.
 */

const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const { ChatAnthropic } = require('@langchain/anthropic');

const MODEL = process.env.AGENT_MODEL || 'claude-haiku-4-5-20251001';

function llm(maxTokens) {
  return new ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: MODEL,
    maxTokens,
    temperature: 0.3,
    maxRetries: 1
  });
}

// Each specialist owns one slice of the scoping question. Keeping the
// remit narrow is what stops three agents returning the same paragraph.
const SPECIALISTS = {
  feasibility: {
    label: 'Data & Feasibility',
    brief:
      'You assess whether the data required to solve this problem plausibly exists and what shape it needs to be in. ' +
      'Cover: what data would have to be collected or already exist, roughly how much, how it would be labelled, ' +
      'and the single most likely reason the data turns out to be the blocker.'
  },
  approach: {
    label: 'Model & Approach',
    brief:
      'You propose the technical approach. Cover: what class of model or system fits, whether an off-the-shelf model ' +
      'is likely to be enough or fine-tuning is needed, and what the simplest thing that could work looks like. ' +
      'Prefer the smallest approach that clears the bar; say so if a non-ML solution would do.'
  },
  deployment: {
    label: 'Deployment & Constraints',
    brief:
      'You assess how this runs in production. Cover: where inference has to happen (edge, on-prem, cloud), ' +
      'the latency and throughput budget the task implies, and what has to be monitored once it is live. ' +
      'Flag any constraint that should change the design if it turns out to be binding.'
  }
};

const State = Annotation.Root({
  problem: Annotation({ reducer: (_, b) => b, default: () => '' }),
  plan: Annotation({ reducer: (_, b) => b, default: () => null }),
  // Specialists run concurrently, so findings must merge rather than overwrite.
  findings: Annotation({ reducer: (a, b) => a.concat(b), default: () => [] }),
  summary: Annotation({ reducer: (_, b) => b, default: () => '' })
});

function firstJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

async function supervisor(state) {
  const res = await llm(700).invoke([
    {
      role: 'system',
      content:
        'You are the supervising agent in a scoping workflow at QVisionX, an applied-AI studio. ' +
        'You do not solve the problem yourself. You restate it precisely, name the measurable target ' +
        'the system would have to move, and write one specific question for each specialist.\n\n' +
        'Specialists available: feasibility (data), approach (model), deployment (production constraints).\n\n' +
        'Reply with JSON only, no prose, in exactly this shape:\n' +
        '{"restated":"<one sentence>","metric":"<the measurable target, e.g. recall at fixed false-positive rate>",' +
        '"questions":{"feasibility":"<question>","approach":"<question>","deployment":"<question>"}}\n\n' +
        'If the problem is vague, still commit to a reasonable interpretation and say so in the restatement.'
    },
    { role: 'user', content: state.problem }
  ]);

  const parsed = firstJson(String(res.content)) || {};
  return {
    plan: {
      restated: parsed.restated || state.problem.slice(0, 200),
      metric: parsed.metric || 'To be defined with the client',
      questions: parsed.questions || {}
    }
  };
}

function specialist(key) {
  const spec = SPECIALISTS[key];
  return async function (state) {
    const question = (state.plan && state.plan.questions && state.plan.questions[key]) ||
      'Assess this problem from your area of responsibility.';

    const res = await llm(500).invoke([
      {
        role: 'system',
        content:
          `You are the ${spec.label} specialist at QVisionX, an applied-AI studio. ${spec.brief}\n\n` +
          'Be concrete and brief: 3 to 5 short sentences, plain prose, no headings or bullet characters. ' +
          'State assumptions explicitly rather than hedging. Never invent client names, benchmarks or prices. ' +
          'Do not promise a specific accuracy or delivery date.'
      },
      {
        role: 'user',
        content:
          `Problem: ${state.plan ? state.plan.restated : state.problem}\n` +
          `Target metric: ${state.plan ? state.plan.metric : 'unspecified'}\n\n` +
          `Your question: ${question}`
      }
    ]);

    return { findings: [{ key, label: spec.label, question, text: String(res.content).trim() }] };
  };
}

async function synthesiser(state) {
  const notes = state.findings
    .map(f => `${f.label}:\n${f.text}`)
    .join('\n\n');

  const res = await llm(700).invoke([
    {
      role: 'system',
      content:
        'You are the supervising agent again. Fold the specialists\' notes into a short scoping brief for the visitor.\n\n' +
        'Structure it as three short paragraphs of plain prose: what the system would have to do and how success is ' +
        'measured; the approach the specialists converged on; and the biggest risk or open question to resolve first.\n\n' +
        'Be direct and specific. No headings, no bullet characters, no markdown. Never invent metrics, client names, ' +
        'prices or timelines. If the specialists disagreed, say so rather than smoothing it over. ' +
        'End with one sentence noting this is a starting point that a real engagement would pressure-test against actual data.'
    },
    {
      role: 'user',
      content:
        `Problem: ${state.plan ? state.plan.restated : state.problem}\n` +
        `Target metric: ${state.plan ? state.plan.metric : 'unspecified'}\n\n${notes}`
    }
  ]);

  return { summary: String(res.content).trim() };
}

const graph = new StateGraph(State)
  .addNode('supervisor', supervisor)
  .addNode('feasibility', specialist('feasibility'))
  .addNode('approach', specialist('approach'))
  .addNode('deployment', specialist('deployment'))
  .addNode('synthesiser', synthesiser)
  .addEdge(START, 'supervisor')
  // Fan out: all three specialists run concurrently off the supervisor.
  .addEdge('supervisor', 'feasibility')
  .addEdge('supervisor', 'approach')
  .addEdge('supervisor', 'deployment')
  // Fan in: LangGraph waits for all three before the synthesiser runs.
  .addEdge('feasibility', 'synthesiser')
  .addEdge('approach', 'synthesiser')
  .addEdge('deployment', 'synthesiser')
  .addEdge('synthesiser', END)
  .compile();

/** Runs the graph, calling onEvent(name, payload) as each node completes. */
async function runScopingGraph(problem, onEvent) {
  const stream = await graph.stream({ problem }, { streamMode: 'updates' });

  for await (const chunk of stream) {
    for (const [node, update] of Object.entries(chunk)) {
      if (node === 'supervisor' && update.plan) {
        onEvent('plan', update.plan);
      } else if (update.findings && update.findings.length) {
        onEvent('finding', update.findings[0]);
      } else if (node === 'synthesiser' && update.summary) {
        onEvent('summary', { text: update.summary });
      }
    }
  }
}

module.exports = { runScopingGraph, SPECIALISTS, AGENT_MODEL: MODEL };
