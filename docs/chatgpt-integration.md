# ChatGPT with your own account

Research checked September 12, 2026. Availability can differ by plan, workspace and enabled features; this project has not verified custom-plugin access on your account.

## Shipped: a reviewable handoff

COACH builds a brief from a selected exercise or program, optional recent logs and active sets, and local progression targets. Copy it into ChatGPT yourself. This uses the conversation you open under your own account, within its limits. The PWA has no AI API traffic or credentials. Responses stay in ChatGPT; apply changes manually in CyberTrainEX.

## Direct embedding with subscription usage

The official documentation reviewed does not establish a general third-party browser embed or model endpoint billed to a personal ChatGPT subscription. OpenAI's documented API integration uses an API key and API credits/billing: [Developer quickstart](https://developers.openai.com/api/docs/quickstart). Do not treat a ChatGPT session cookie or Codex login token as a substitute API key. This project collects neither.

## Deeper integration: CyberTrainEX tools inside ChatGPT

OpenAI documents plugins containing MCP servers and optional UI. The server exposes tools, schemas and authorization; ChatGPT can call those tools and present data or an interface. See [Plugin architecture](https://developers.openai.com/plugins/concepts/plugins). This supports a design where the training integration lives inside ChatGPT, with ChatGPT doing the conversation. It does not establish a subscription-backed chatbot embed inside an arbitrary website.

Proposed implementation:

1. Add an authenticated data service. Browser localStorage cannot be read by a remote ChatGPT tool; explicitly sync or upload selected records.
2. Expose narrow tools: `list_exercises`, `get_session`, `get_progression_context`, and `propose_program_change`. Return structured data with validated schemas.
3. Keep local progression as the baseline. Let ChatGPT explain or propose bounded changes, including rationale and exact before/after values.
4. Review proposals before a separate write action applies them. Validate exercise IDs, equipment, loads and rep ranges server-side. Record history and support undo.
5. Connect and test in the user's supported ChatGPT environment; verify account availability, authentication and limits before treating it as operational.

Hosting, database and maintenance may still have costs even if the integration makes no separate OpenAI API calls. No hosted service, plugin registration or automatic program write was created in this iteration. A local companion is another possible implementation but needs a supported local tool runtime; the static phone PWA cannot invoke desktop Codex directly.

Use the shipped handoff now. If automatic access to training data is essential, build and connect the authenticated ChatGPT plugin next. Use a separately billed API backend if a chatbot must run directly inside the standalone PWA.
