# ChatGPT with your own account

Research checked September 12, 2026. Availability can differ by plan, workspace and enabled features; this project has not verified custom-plugin access on your account.

## Shipped: a reviewable handoff

COACH builds a brief from a selected exercise or program, optional recent logs and active sets, and local progression targets. Copy it into ChatGPT yourself. This uses the conversation you open under your own account, within its limits. The PWA has no AI API traffic or credentials. Responses stay in ChatGPT; apply changes manually in CyberTrainEX.

## Native coach with subscription access: Codex App Server

Follow-up research found a supported integration missed in the initial assessment: [Codex App Server](https://learn.chatgpt.com/docs/app-server) is designed to embed Codex conversations in another product and supports managed ChatGPT sign-in. [Authentication documentation](https://learn.chatgpt.com/docs/auth) distinguishes subscription access from API-key billing.

A native CyberTrainEX coach can therefore use a private companion service running Codex App Server, signed in with the user's ChatGPT account, while the installable phone PWA stays on GitHub Pages. The PWA can pass selected exercise/session context automatically and display replies in-app. This uses Codex capabilities and account limits, rather than embedding the ChatGPT website or calling a general ChatGPT subscription API.

The companion must run on an available PC/server and be reachable from the phone through authenticated HTTPS. GitHub Pages cannot run it. Keep account credentials on the companion; expose only coaching operations, not unrestricted agent/file/shell access. Validate structured progression proposals and let the user apply them in-app. No copying/pasting is required by this design. It is a proposed implementation, not connected functionality in the current deployment. The next decision is home-PC hosting versus an independently hosted companion.

## Static-only embedding

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

The shipped copy/paste handoff was rejected as unsuitable. The native replacement should use the Codex companion described above, subject to the hosting decision. A ChatGPT plugin is a different option that runs the experience inside ChatGPT. A separately billed API backend remains an option only if subscription-based Codex integration is not wanted.
