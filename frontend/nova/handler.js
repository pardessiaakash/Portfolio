// Nova's AI server: one small serverless function that answers visitors'
// chat messages with Claude, using everything on the site as its knowledge.
// Platform wrappers: /api/nova.js (Vercel) and /netlify/functions/nova.mjs.
//
// Settings (environment variables on the host, never in the browser):
//   ANTHROPIC_API_KEY  required. The Anthropic API key.
//   NOVA_MODEL         optional. Default claude-sonnet-5-5.
//   ALLOWED_ORIGINS    optional. Comma-separated site addresses allowed to
//                      call this (e.g. https://akashp.design); empty = any.

import { PERSONA, buildKnowledge } from "./knowledge.js";

const MAX_TURNS = 16;          // recent messages sent to the model
const MAX_CHARS = 2000;        // per visitor message
const MAX_TOKENS = 900;        // per reply
const RATE = { windowMs: 60_000, max: 20 };   // per visitor, per warm instance

const hits = new Map();
const rateLimited = (key) => {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE.max;
};

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

let knowledge = null;          // built once per instance

export async function handleNova(request, env = {}) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const cors = allowed.length
    ? (allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : null)
    : { "Access-Control-Allow-Origin": "*" };
  if (!cors) return json(403, { error: "origin not allowed" });
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (request.method === "GET") return json(200, { ok: true, configured: !!env.ANTHROPIC_API_KEY }, cors);
  if (request.method !== "POST") return json(405, { error: "POST only" }, cors);
  if (!env.ANTHROPIC_API_KEY) return json(503, { error: "not configured" }, cors);

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  if (rateLimited(ip)) return json(429, { error: "slow down" }, cors);

  let body;
  try { body = await request.json(); } catch { return json(400, { error: "bad json" }, cors); }
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  // the API needs user/assistant turns to alternate: merge repeats
  const turns = [];
  for (const m of messages) {
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else turns.push({ ...m });
  }
  if (!turns.length || turns[turns.length - 1].role !== "user") return json(400, { error: "no question" }, cors);

  knowledge = knowledge || buildKnowledge();
  const context = typeof body.context === "string" && body.context.trim()
    ? `\n\nWhere the visitor is right now: ${body.context.slice(0, 300)}` : "";

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.NOVA_MODEL || "claude-sonnet-5-5",
      max_tokens: MAX_TOKENS,
      stream: true,
      // the persona and the site's knowledge are the same for every visitor:
      // cached, so each message only pays full price for the conversation
      system: [
        { type: "text", text: PERSONA },
        { type: "text", text: knowledge, cache_control: { type: "ephemeral" } },
        ...(context ? [{ type: "text", text: context }] : []),
      ],
      messages: turns,
    }),
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    const status = upstream?.status || 502;
    let detail = "";
    try { detail = (await upstream.json())?.error?.message || ""; } catch {}
    console.error("Nova upstream error", status, detail);
    return json(status === 429 || status === 529 ? 503 : 502, { error: "upstream" }, cors);
  }

  // Claude streams server-sent events; pass the text on as it arrives, as
  // plain text, so the reply appears word by word in the chat.
  const enc = new TextEncoder(), dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            let ev;
            try { ev = JSON.parse(line.slice(5)); } catch { continue; }
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
              controller.enqueue(enc.encode(ev.delta.text));
            } else if (ev.type === "error") {
              console.error("Nova stream error", ev.error);
              controller.enqueue(enc.encode("\n\nSorry, I lost my train of thought there. Could you ask that again?"));
            }
          }
        }
      } catch (e) {
        console.error("Nova stream broke", e);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Nova": "1" },
  });
}
