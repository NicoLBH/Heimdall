import { ASSIST_LLM_URL_PROD } from "../constants.js";
import { store } from "../store.js";
import { buildAssistContext } from "./assist-context.js";

function normalizeMessage(message) {
  return String(message || "").trim();
}

function historyForPayload() {
  const all = Array.isArray(store.ui?.assistant?.messages)
    ? store.ui.assistant.messages
    : [];

  return all.slice(-12).map((msg) => ({
    role: msg.role,
    content: msg.content,
    ts: msg.ts || new Date().toISOString()
  }));
}

function parseAssistantReply(data) {
  if (!data) return "Je n’ai pas reçu de réponse exploitable.";
  if (typeof data === "string") return data.trim() || "Réponse vide.";
  if (typeof data.reply_markdown === "string" && data.reply_markdown.trim()) return data.reply_markdown.trim();
  if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (Array.isArray(data.messages) && data.messages.length) {
    const last = data.messages[data.messages.length - 1];
    if (typeof last?.content === "string" && last.content.trim()) return last.content.trim();
  }
  return JSON.stringify(data, null, 2);
}

export async function sendAssistMessage(message, options = {}) {
  const content = normalizeMessage(message);
  if (!content) {
    throw new Error("Message vide.");
  }

  const context = buildAssistContext();
  const payload = {
    channel: "assist_overlay",
    mode: options.mode || store.ui?.assistant?.mode || "auto",
    user_message: content,
    history: historyForPayload(),
    context
  };

  const response = await fetch(ASSIST_LLM_URL_PROD, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Webhook assistant en erreur (${response.status})${text ? ` — ${text.slice(0, 220)}` : ""}`);
  }

  const data = await response.json().catch(() => null);
  return {
    raw: data,
    reply: parseAssistantReply(data),
    context
  };
}
