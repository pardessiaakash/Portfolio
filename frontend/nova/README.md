# Nova: the site's AI assistant

Nova answers visitors' questions about Akash, his case studies and this site,
in a natural, conversational way (Claude, by Anthropic).

## How Nova "knows" things

Nothing is fine-tuned. Each message is answered by Claude with:

1. **A persona** (`knowledge.js` → `PERSONA`): who Nova is, how it talks
   (warm, direct, short by default), and its rules (polite always, never invents
   facts, sends hiring questions to Akash's email).
2. **The site's own content** (`knowledge.js` → `buildKnowledge`): About Me
   (`src/profileData.js`), every case-study slide (`src/caseStudyText.js`) and the
   contact details (`src/siteConfig.js`), about 16k tokens.
3. **The conversation so far** (last 16 messages), plus which case study the
   visitor has open.

Change the site's content and Nova knows it on the next deploy. To teach Nova
something that isn't on the site (for example availability, location or
tools), add a line to `buildKnowledge` in `knowledge.js`.

The persona and knowledge are sent with prompt caching, so after the first
message they cost about a tenth of the normal price.

## Setup (once)

1. Create an API key at https://console.anthropic.com (Settings → API keys).
   Under Billing, add credit and set a monthly **spend limit** (e.g. $10–20).
2. In the hosting dashboard (Vercel or Netlify → Project settings →
   Environment variables) add:
   - `ANTHROPIC_API_KEY` = the key (keep it secret; never put it in the
     frontend or in Git)
   - optional `NOVA_MODEL` = `claude-sonnet-5-5` (default, best answers) or
     `claude-haiku-5-5` (cheaper and faster)
   - optional `ALLOWED_ORIGINS` = the live address, e.g. `https://akashp.design`,
     so other sites can't use your key
3. Redeploy. The function is served at `/api/nova`:
   - Vercel: `api/nova.js` (Edge function, no extra setup)
   - Netlify: `netlify/functions/nova.mjs` (no extra setup)
4. Check: open `https://<your-site>/api/nova` in a browser. It should say
   `{"ok":true,"configured":true}`.

Without the key (or locally with `npm start`), the chat falls back to the
built-in answers for the suggested topics (`src/chat/offlineAnswers.js`).

## Limits built in

- Up to 900 tokens per reply, 2,000 characters per question, last 16 messages.
- About 20 messages per minute per visitor.
- Replies stream word by word, like ChatGPT or Claude.
