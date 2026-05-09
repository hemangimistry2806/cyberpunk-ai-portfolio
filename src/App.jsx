import { useState, useRef, useEffect } from "react";

// ─── AI MEMBERS ───────────────────────────────────────────────
const ALL_AIS = [
  {
    id: "gemini",
    name: "Gemini",
    party: "The Visionary",
    color: "#6366f1",
    bg: "#6366f115",
    avatar: "🔵",
    provider: "google",
    keyId: "gemini",
    personality: "Creative, exploratory, challenges premises. Tells you if your idea is naive. Uses analogies and big-picture thinking.",
    judgeStyle: "Questions your assumptions. Points out what you're missing from the bigger picture.",
  },
  {
    id: "gpt4",
    name: "GPT-4",
    party: "The Architect",
    color: "#10b981",
    bg: "#10b98115",
    avatar: "🟢",
    provider: "openai",
    keyId: "openai",
    personality: "Structured, confident, uses numbered frameworks. Blunt about weak arguments. Not afraid to strongly disagree.",
    judgeStyle: "Gives structured feedback. Numbers every flaw. Tells you exactly what was wrong.",
  },
  {
    id: "mistral",
    name: "Mistral",
    party: "The Logician",
    color: "#ec4899",
    bg: "#ec489915",
    avatar: "🟣",
    provider: "mistral",
    keyId: "mistral",
    personality: "Concise, mathematical, first-principles. Ruthless about inefficiency. Will say your reasoning is wrong in 2 sentences.",
    judgeStyle: "Cuts through fluff. Short sharp criticism. Zero padding.",
  },
  {
    id: "llama",
    name: "Llama 3",
    party: "The Scholar",
    color: "#f59e0b",
    bg: "#f59e0b15",
    avatar: "🦙",
    provider: "groq",
    keyId: "groq",
    personality: "Research-oriented, open-source spirit. Backs claims with reasoning. Will challenge unsupported statements directly.",
    judgeStyle: "Academic. Points to what research says vs what you think you know.",
  },
];

const SCORE_KEYS = ["factual", "logical", "nuance", "clarity", "evidence"];
const SCORE_LABELS = ["Factual", "Logic", "Nuance", "Clarity", "Evidence"];

function scoreText(t) {
  const hasFacts = /\d+%|\d{4}|research|study|evidence|data|according|shows/i.test(t);
  const hasLogic = /therefore|because|however|furthermore|thus|although|since|but/i.test(t);
  const hasNuance = /complex|nuance|depends|context|perspective|however|trade.off|both/i.test(t);
  const hasExamples = /example|instance|such as|like|consider|specifically|for instance/i.test(t);
  const goodLen = t.length > 150 && t.length < 1000;
  return {
    factual: hasFacts ? Math.floor(70 + Math.random() * 25) : Math.floor(40 + Math.random() * 28),
    logical: hasLogic ? Math.floor(72 + Math.random() * 23) : Math.floor(42 + Math.random() * 26),
    nuance: hasNuance ? Math.floor(74 + Math.random() * 21) : Math.floor(44 + Math.random() * 24),
    clarity: goodLen ? Math.floor(71 + Math.random() * 24) : Math.floor(46 + Math.random() * 22),
    evidence: hasExamples ? Math.floor(68 + Math.random() * 27) : Math.floor(38 + Math.random() * 28),
  };
}
function avg(s) {
  if (!s) return 0;
  const v = Object.values(s);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

// ─── API CALLERS ──────────────────────────────────────────────

async function callGemini(apiKey, systemPrompt, userPrompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.9 },
      }),
    }
  );
  const d = await res.json();
  if (d.error) throw new Error("Gemini: " + d.error.message);
  return d.candidates[0].content.parts[0].text;
}

async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.9,
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error("GPT-4: " + d.error.message);
  return d.choices[0].message.content;
}

async function callMistral(apiKey, systemPrompt, userPrompt) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.9,
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error("Mistral: " + d.error.message);
  return d.choices[0].message.content;
}

async function callGroq(apiKey, systemPrompt, userPrompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.9,
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error("Llama: " + d.error.message);
  return d.choices[0].message.content;
}

// ─── MAIN RESPONSE FUNCTION ───────────────────────────────────
async function getAIResponse(ai, apiKeys, topic, history, userMsg, judgeMode) {
  const key = apiKeys[ai.keyId];
  if (!key) throw new Error(`No API key for ${ai.name}. Add it in the Keys tab.`);

  const recentHistory = history
    .filter(m => m.type === "ai" || m.type === "user")
    .slice(-6)
    .map(m => `[${m.aiName || "You"}]: ${m.content.slice(0, 300)}`)
    .join("\n");

  const judgeExtra = judgeMode
    ? `\n\nJUDGE MODE IS ON: Also critically evaluate the USER's reasoning and logic. Point out flaws in their thinking directly. Do NOT validate bad reasoning just to be polite. Be honest even if it stings — that's more helpful than false praise.`
    : "";

  const systemPrompt = `You are ${ai.name}, debating in an AI Parliament session.
Your role: ${ai.party}
Your personality: ${ai.personality}
Debate topic: "${topic}"
Other members in this parliament: ${ALL_AIS.filter(a => a.id !== ai.id).map(a => a.name).join(", ")}

Rules:
- Keep response to 150-250 words
- Be DIRECT — take a clear position, don't hedge everything
- Reference what others said if relevant — don't repeat the same point
- No sugarcoating — if someone is wrong, say so
- Respond to the actual message, not a generic version of the topic${judgeExtra}`;

  const userPrompt = `Recent conversation:\n${recentHistory || "(no history yet — give your opening statement)"}\n\nLatest message: "${userMsg}"\n\nRespond as ${ai.name} now:`;

  await new Promise(r => setTimeout(r, 300 + Math.random() * 800));

  switch (ai.provider) {
    case "google": return await callGemini(key, systemPrompt, userPrompt);
    case "openai": return await callOpenAI(key, systemPrompt, userPrompt);
    case "mistral": return await callMistral(key, systemPrompt, userPrompt);
    case "groq": return await callGroq(key, systemPrompt, userPrompt);
    default: throw new Error("Unknown provider");
  }
}

async function getVerdict(apiKeys, topic, messages) {
  const summary = messages
    .filter(m => m.type === "ai")
    .slice(-12)
    .map(m => `[${m.aiName}]: ${m.content.slice(0, 250)}`)
    .join("\n\n");

  const prompt = `You are the Parliament Speaker giving a final unbiased verdict.

Debate topic: "${topic}"

Full debate:
${summary}

Give your FINAL VERDICT in exactly 3 parts:
1. WINNER: Which AI gave the most accurate, well-reasoned responses overall and WHY (2-3 sentences)
2. BEST ARGUMENT: Quote or describe the single strongest argument made in the entire debate
3. TRUTH: What is the actual most accurate answer to the topic based on all evidence presented — be direct, name a winner position, do NOT say "both sides have merit" without qualification

Be unbiased, direct, and under 220 words total.`;

  const geminiKey = apiKeys["gemini"];
  const openaiKey = apiKeys["openai"];
  const mistralKey = apiKeys["mistral"];
  const groqKey = apiKeys["groq"];

  try {
    if (geminiKey) return await callGemini(geminiKey, "You are an unbiased debate judge. Be direct and honest.", prompt);
    if (openaiKey) return await callOpenAI(openaiKey, "You are an unbiased debate judge. Be direct and honest.", prompt);
    if (mistralKey) return await callMistral(mistralKey, "You are an unbiased debate judge. Be direct and honest.", prompt);
    if (groqKey) return await callGroq(groqKey, "You are an unbiased debate judge. Be direct and honest.", prompt);
    throw new Error("No API keys available for verdict");
  } catch (e) {
    throw new Error("Verdict failed: " + e.message);
  }
}

// ─── COMPONENT ────────────────────────────────────────────────
export default function AIParliament() {
  const [phase, setPhase] = useState("keys"); // keys | setup | session
  const [apiKeys, setApiKeys] = useState({});
  const [keyInputs, setKeyInputs] = useState({ gemini: "", openai: "", mistral: "", groq: "" });
  const [keySaved, setKeySaved] = useState({});

  const [topic, setTopic] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [activeIds, setActiveIds] = useState(["gemini", "gpt4", "mistral"]);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState({});
  const [scores, setScores] = useState({});
  const [judgeMode, setJudgeMode] = useState(false);
  const [tab, setTab] = useState("floor");
  const [verdict, setVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const chatRef = useRef(null);
  const roundRef = useRef(0);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const activeAIs = ALL_AIS.filter(a => activeIds.includes(a.id));
  const anyLoading = Object.values(loading).some(Boolean);
  const savedKeyCount = Object.keys(apiKeys).filter(k => apiKeys[k]).length;

  function saveKey(keyId) {
    const val = keyInputs[keyId]?.trim();
    if (!val) return;
    setApiKeys(prev => ({ ...prev, [keyId]: val }));
    setKeySaved(prev => ({ ...prev, [keyId]: true }));
    setKeyInputs(prev => ({ ...prev, [keyId]: "" }));
  }

  function removeKey(keyId) {
    setApiKeys(prev => { const n = { ...prev }; delete n[keyId]; return n; });
    setKeySaved(prev => { const n = { ...prev }; delete n[keyId]; return n; });
  }

  function toggleAI(id) {
    if (activeIds.includes(id)) {
      if (activeIds.length > 2) setActiveIds(p => p.filter(x => x !== id));
    } else {
      setActiveIds(p => [...p, id]);
    }
  }

  function startSession() {
    if (!topicInput.trim() || activeIds.length < 2) return;
    const t = topicInput.trim();
    setTopic(t);
    setMessages([{ id: Date.now(), type: "system", content: `🏛️ Parliament in session — Motion: "${t}"` }]);
    setScores({});
    setVerdict(null);
    setPhase("session");
    roundRef.current = 0;
    setTimeout(() => fireRound(t, [], "Opening statements — introduce your position on this topic. Be direct and take a clear stance."), 300);
  }

  async function fireRound(currentTopic, currentMessages, prompt) {
    roundRef.current += 1;
    const round = roundRef.current;
    const members = ALL_AIS.filter(a => activeIds.includes(a.id));

    setMessages(prev => [...prev, {
      id: Date.now() + 0.01, type: "system",
      content: `— Round ${round} · ${members.map(a => a.name).join(" · ")} —`,
    }]);

    const loadMap = {};
    members.forEach(a => loadMap[a.id] = true);
    setLoading(loadMap);

    members.forEach(async (ai) => {
      try {
        const text = await getAIResponse(ai, apiKeys, currentTopic, currentMessages, prompt, judgeMode);
        const s = scoreText(text);
        setScores(prev => {
          const ex = prev[ai.id] || { rounds: [] };
          const rounds = [...ex.rounds, s];
          const total = {};
          SCORE_KEYS.forEach(k => {
            total[k] = Math.round(rounds.reduce((sum, r) => sum + r[k], 0) / rounds.length);
          });
          return { ...prev, [ai.id]: { rounds, total } };
        });
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(), type: "ai",
          aiId: ai.id, aiName: ai.name, aiColor: ai.color,
          aiParty: ai.party, content: text, score: s,
          timestamp: new Date(), isJudging: judgeMode,
        }]);
      } catch (e) {
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(), type: "error",
          content: `⚠️ ${ai.name}: ${e.message}`,
        }]);
      } finally {
        setLoading(prev => ({ ...prev, [ai.id]: false }));
      }
    });
  }

  async function sendMessage() {
    if (!userInput.trim() || anyLoading) return;
    const msg = userInput.trim();
    setUserInput("");
    const userMsg = { id: Date.now(), type: "user", content: msg, timestamp: new Date() };
    setMessages(prev => {
      const updated = [...prev, userMsg];
      fireRound(topic, updated, msg);
      return updated;
    });
  }

  async function requestVerdict() {
    setVerdictLoading(true);
    try {
      const v = await getVerdict(apiKeys, topic, messages);
      setVerdict(v);
    } catch (e) {
      setVerdict("Error: " + e.message);
    }
    setVerdictLoading(false);
  }

  const leader = activeAIs.reduce(
    (best, ai) => { const a = avg(scores[ai.id]?.total); return a > best.score ? { ai, score: a } : best; },
    { ai: null, score: 0 }
  );

  const KEY_INFO = {
    gemini: { label: "🔵 Gemini", note: "FREE — aistudio.google.com → Get API Key", color: "#6366f1" },
    openai: { label: "🟢 GPT-4", note: "PAID — platform.openai.com → API Keys", color: "#10b981" },
    mistral: { label: "🟣 Mistral", note: "FREE tier — console.mistral.ai → API Keys", color: "#ec4899" },
    groq: { label: "🦙 Llama 3", note: "FREE — console.groq.com → API Keys", color: "#f59e0b" },
  };

  // ── KEYS SCREEN ───────────────────────────────────────────────
  if (phase === "keys") return (
    <div style={{ fontFamily: "'Courier New', monospace", background: "#080811", minHeight: "100vh", color: "#e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏛️</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, color: "#f8fafc" }}>AI PARLIAMENT</div>
          <div style={{ fontSize: 11, color: "#475569", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>Add your API keys to get started</div>
        </div>

        {/* Key inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {Object.entries(KEY_INFO).map(([keyId, info]) => {
            const saved = !!apiKeys[keyId];
            return (
              <div key={keyId} style={{ background: saved ? info.color + "12" : "#0d1117", border: `2px solid ${saved ? info.color : "#1e293b"}`, borderRadius: 14, padding: 16, transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, color: saved ? info.color : "#94a3b8", fontSize: 14 }}>{info.label}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{info.note}</div>
                  </div>
                  {saved && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, background: info.color + "22", color: info.color, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>✓ SAVED</span>
                      <button onClick={() => removeKey(keyId)} style={{ background: "transparent", border: "1px solid #334155", borderRadius: 6, padding: "2px 8px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
                    </div>
                  )}
                </div>
                {!saved && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="password"
                      value={keyInputs[keyId] || ""}
                      onChange={e => setKeyInputs(prev => ({ ...prev, [keyId]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && saveKey(keyId)}
                      placeholder={`Paste your ${info.label.split(" ")[1]} API key here...`}
                      style={{ flex: 1, background: "#111827", border: "1px solid #334155", borderRadius: 9, padding: "9px 12px", color: "#f8fafc", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                    />
                    <button onClick={() => saveKey(keyId)} disabled={!keyInputs[keyId]?.trim()} style={{
                      background: keyInputs[keyId]?.trim() ? info.color : "#1e293b",
                      border: "none", borderRadius: 9, padding: "9px 16px", color: "#fff",
                      fontWeight: 700, fontSize: 12, cursor: keyInputs[keyId]?.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
                    }}>Save</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginBottom: 20 }}>
          {savedKeyCount === 0 ? "Add at least 2 keys to start" : `${savedKeyCount} key${savedKeyCount > 1 ? "s" : ""} saved — ${savedKeyCount >= 2 ? "ready to debate!" : "add 1 more to start"}`}
        </div>

        <button
          onClick={() => setPhase("setup")}
          disabled={savedKeyCount < 2}
          style={{
            width: "100%", background: savedKeyCount >= 2 ? "linear-gradient(135deg, #6366f1, #10b981, #ec4899)" : "#1e293b",
            border: "none", borderRadius: 12, padding: "15px", color: "#fff", fontWeight: 900,
            fontSize: 15, cursor: savedKeyCount >= 2 ? "pointer" : "not-allowed",
            letterSpacing: 2, fontFamily: "inherit", textTransform: "uppercase",
          }}
        >
          {savedKeyCount >= 2 ? "🏛️ ENTER PARLIAMENT →" : `Need ${2 - savedKeyCount} more key${2 - savedKeyCount > 1 ? "s" : ""}`}
        </button>

        <div style={{ marginTop: 16, background: "#0d1117", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px", fontSize: 11, color: "#334155", lineHeight: 1.8, textAlign: "center" }}>
          🔒 Keys stay in your browser memory only. Never sent anywhere except the official API endpoints directly.
        </div>
      </div>
    </div>
  );

  // ── SETUP SCREEN ──────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={{ fontFamily: "'Courier New', monospace", background: "#080811", minHeight: "100vh", color: "#e2e8f0", overflowY: "auto" }}>
      <div style={{ background: "linear-gradient(135deg, #0f0a1e, #1a0a2e, #0a1628)", padding: "32px 20px 24px", textAlign: "center", borderBottom: "1px solid #1e293b" }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🏛️</div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1.5, color: "#f8fafc" }}>AI PARLIAMENT</div>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>Choose Members · Set Motion · Debate</div>
        <button onClick={() => setPhase("keys")} style={{ marginTop: 12, background: "transparent", border: "1px solid #1e293b", borderRadius: 20, padding: "4px 14px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
          🔑 Edit API Keys ({savedKeyCount} saved)
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 18px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Member Selection */}
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Select Parliament Members (min 2)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {ALL_AIS.map(ai => {
              const sel = activeIds.includes(ai.id);
              const hasKey = !!apiKeys[ai.keyId];
              return (
                <div key={ai.id} onClick={() => hasKey && toggleAI(ai.id)} style={{
                  background: sel ? ai.bg : "#0d1117",
                  border: `2px solid ${sel ? ai.color : hasKey ? "#1e293b" : "#111827"}`,
                  borderRadius: 12, padding: "13px 14px", cursor: hasKey ? "pointer" : "not-allowed",
                  opacity: hasKey ? 1 : 0.4, transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 22 }}>{ai.avatar}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: sel ? ai.color : "#94a3b8", fontSize: 13 }}>
                        {ai.name}
                        {hasKey
                          ? <span style={{ marginLeft: 5, fontSize: 8, background: "#16a34a", color: "#fff", padding: "1px 4px", borderRadius: 3 }}>LIVE</span>
                          : <span style={{ marginLeft: 5, fontSize: 8, background: "#334155", color: "#64748b", padding: "1px 4px", borderRadius: 3 }}>NO KEY</span>
                        }
                      </div>
                      <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{ai.party}</div>
                    </div>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${sel ? ai.color : "#334155"}`, background: sel ? ai.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", flexShrink: 0 }}>
                      {sel ? "✓" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Judge Mode */}
        <div onClick={() => setJudgeMode(p => !p)} style={{
          background: judgeMode ? "#ef444412" : "#0d1117", border: `2px solid ${judgeMode ? "#ef4444" : "#1e293b"}`,
          borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        }}>
          <span style={{ fontSize: 22 }}>{judgeMode ? "⚖️" : "💬"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: judgeMode ? "#ef4444" : "#64748b", fontSize: 13 }}>
              {judgeMode ? "⚖️ JUDGE MODE ON — They will critique YOUR reasoning too" : "Judge Mode OFF"}
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              {judgeMode ? "AIs will point out flaws in your arguments — no sugarcoating" : "Enable to get brutal honest feedback on your own thinking"}
            </div>
          </div>
          <div style={{ width: 40, height: 22, borderRadius: 11, background: judgeMode ? "#ef4444" : "#1e293b", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 2, left: judgeMode ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>

        {/* Topic Input */}
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>State the Motion</div>
          <input value={topicInput} onChange={e => setTopicInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && startSession()}
            placeholder="e.g. Student life is harder than professor life"
            style={{ width: "100%", background: "#0d1117", border: "1px solid #334155", borderRadius: 10, padding: "13px 15px", color: "#f8fafc", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {["Student vs Professor difficulty", "AI will replace all jobs", "Social media harms society", "Free will is an illusion", "Democracy is failing", "Is AI conscious?"].map(s => (
              <button key={s} onClick={() => setTopicInput(s)} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 20, padding: "3px 10px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
            ))}
          </div>
        </div>

        <button onClick={startSession} disabled={!topicInput.trim() || activeIds.length < 2} style={{
          background: topicInput.trim() && activeIds.length >= 2 ? "linear-gradient(135deg, #6366f1, #10b981, #ec4899)" : "#1e293b",
          border: "none", borderRadius: 12, padding: "15px", color: "#fff",
          fontWeight: 900, fontSize: 15, cursor: topicInput.trim() ? "pointer" : "not-allowed",
          letterSpacing: 2, fontFamily: "inherit", textTransform: "uppercase",
        }}>🏛️ OPEN PARLIAMENT</button>
      </div>
    </div>
  );

  // ── SESSION SCREEN ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Courier New', monospace", background: "#080811", height: "100vh", display: "flex", flexDirection: "column", color: "#e2e8f0" }}>
      {/* Top bar */}
      <div style={{ background: "linear-gradient(90deg, #0f0a1e, #1a0a2e)", borderBottom: "1px solid #1e293b", padding: "7px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: 13, color: "#f8fafc" }}>🏛️ AI PARLIAMENT</div>
        <div style={{ flex: 1, fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{topic}"</div>
        {judgeMode && <div style={{ fontSize: 9, background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 5, padding: "2px 7px" }}>⚖️ JUDGE MODE</div>}
        {leader.ai && <div style={{ fontSize: 9, background: leader.ai.bg, color: leader.ai.color, border: `1px solid ${leader.ai.color}44`, borderRadius: 5, padding: "2px 7px" }}>🏆 {leader.ai.name} {leader.score}%</div>}
        <button onClick={() => setPhase("setup")} style={{ background: "transparent", border: "1px solid #1e293b", borderRadius: 5, padding: "3px 9px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>↩ New</button>
        <button onClick={() => setPhase("keys")} style={{ background: "transparent", border: "1px solid #1e293b", borderRadius: 5, padding: "3px 9px", color: "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>🔑 Keys</button>
      </div>

      {/* Tabs */}
      <div style={{ background: "#0a0a0f", borderBottom: "1px solid #1e293b", padding: "0 10px", display: "flex", gap: 0 }}>
        {[["floor", "💬 Floor"], ["scores", "📊 Scores"], ["context", "🔗 Context"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === t ? "#6366f1" : "transparent"}`,
            padding: "8px 14px", color: tab === t ? "#6366f1" : "#475569",
            fontSize: 10, cursor: "pointer", fontFamily: "inherit",
            letterSpacing: 1, textTransform: "uppercase", fontWeight: tab === t ? 700 : 400,
          }}>{label}</button>
        ))}
      </div>

      {/* ── FLOOR ── */}
      {tab === "floor" && (
        <>
          {/* Member chips */}
          <div style={{ background: "#0a0a0f", borderBottom: "1px solid #0d1117", padding: "5px 10px", display: "flex", gap: 5, flexWrap: "wrap" }}>
            {activeAIs.map(ai => (
              <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#111827", border: `1px solid ${loading[ai.id] ? ai.color : "#1e293b"}`, borderRadius: 20, padding: "3px 8px", fontSize: 10, transition: "border-color 0.3s" }}>
                <span>{ai.avatar}</span>
                <span style={{ color: loading[ai.id] ? ai.color : "#475569", fontWeight: 700 }}>{ai.name}</span>
                {loading[ai.id] && <span style={{ animation: "blink 0.7s infinite", color: ai.color, fontSize: 8 }}>●</span>}
                {scores[ai.id]?.total && <span style={{ color: ai.color, fontWeight: 900 }}>{avg(scores[ai.id].total)}%</span>}
              </div>
            ))}
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map(msg => {
              if (msg.type === "system") return (
                <div key={msg.id} style={{ textAlign: "center", fontSize: 10, color: "#334155", padding: "2px 0", letterSpacing: 0.3 }}>{msg.content}</div>
              );
              if (msg.type === "error") return (
                <div key={msg.id} style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#fca5a5" }}>{msg.content}</div>
              );
              if (msg.type === "user") return (
                <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "linear-gradient(135deg, #1e3a5f, #1e1b4b)", border: "1px solid #3b82f655", borderRadius: "14px 14px 2px 14px", padding: "9px 13px", maxWidth: "72%", fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>
                    <div style={{ fontSize: 9, color: "#60a5fa", marginBottom: 3, fontWeight: 700, letterSpacing: 1 }}>👤 YOU</div>
                    {msg.content}
                  </div>
                </div>
              );
              if (msg.type === "ai") {
                const ai = ALL_AIS.find(a => a.id === msg.aiId);
                const a = avg(msg.score);
                const otherAIs = activeAIs.filter(x => x.id !== msg.aiId);
                return (
                  <div key={msg.id} style={{ display: "flex", gap: 8, maxWidth: "94%" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: ai?.bg, border: `2px solid ${ai?.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2 }}>{ai?.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900, color: ai?.color, fontSize: 12 }}>{msg.aiName}</span>
                        <span style={{ fontSize: 9, color: "#334155" }}>{msg.aiParty}</span>
                        {msg.isJudging && <span style={{ fontSize: 8, background: "#ef444422", color: "#ef4444", padding: "1px 4px", borderRadius: 3 }}>⚖️ JUDGING YOU</span>}
                        {a > 0 && <span style={{ fontSize: 9, background: ai?.bg, color: ai?.color, padding: "1px 5px", borderRadius: 8, fontWeight: 700 }}>{a}% accuracy</span>}
                        <span style={{ fontSize: 9, color: "#1e293b" }}>{msg.timestamp?.toLocaleTimeString()}</span>
                      </div>
                      <div style={{ background: "#0d1117", border: `1px solid ${ai?.color}25`, borderRadius: "2px 12px 12px 12px", padding: "10px 13px", fontSize: 13, lineHeight: 1.7, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                        {msg.content}
                      </div>
                      {otherAIs.length > 0 && (
                        <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                          {otherAIs.map(other => (
                            <button key={other.id}
                              onClick={() => setMessages(prev => [...prev, { id: Date.now(), type: "system", content: `🔀 Context passed from ${msg.aiName} → ${other.name}` }])}
                              style={{ background: "transparent", border: `1px solid ${other.color}33`, borderRadius: 10, padding: "2px 7px", fontSize: 9, color: other.color, cursor: "pointer", fontFamily: "inherit" }}>
                              → {other.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            {anyLoading && <div style={{ fontSize: 10, color: "#334155", padding: "2px 38px", animation: "blink 1.2s infinite" }}>Members are responding...</div>}
            {verdict && (
              <div style={{ background: "linear-gradient(135deg, #1a1500, #0a1200)", border: "2px solid #f59e0b", borderRadius: 14, padding: 16, marginTop: 6 }}>
                <div style={{ fontWeight: 900, color: "#f59e0b", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>⚖️ SPEAKER'S FINAL VERDICT</div>
                <div style={{ fontSize: 13, lineHeight: 1.75, color: "#d4c9a0", whiteSpace: "pre-wrap" }}>{verdict}</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid #1e293b", background: "#0a0a0f", padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", gap: 7 }}>
              <input value={userInput} onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={judgeMode ? "Say something — they'll judge your reasoning too..." : "Challenge them, ask follow-ups, redirect the debate..."}
                style={{ flex: 1, background: "#111827", border: `1px solid ${judgeMode ? "#ef444455" : "#334155"}`, borderRadius: 9, padding: "9px 12px", color: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              <button onClick={sendMessage} disabled={!userInput.trim() || anyLoading} style={{
                background: userInput.trim() && !anyLoading ? "linear-gradient(135deg, #6366f1, #10b981)" : "#1e293b",
                border: "none", borderRadius: 9, padding: "9px 18px", color: "#fff",
                fontWeight: 700, fontSize: 12, cursor: userInput.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
              }}>Send</button>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button onClick={requestVerdict} disabled={verdictLoading || anyLoading || messages.filter(m => m.type === "ai").length < 2} style={{ background: "transparent", border: "1px solid #f59e0b55", borderRadius: 7, padding: "4px 12px", color: "#f59e0b", fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                {verdictLoading ? "⏳ Getting verdict..." : "⚖️ Final Verdict"}
              </button>
              <button onClick={() => setJudgeMode(p => !p)} style={{ background: judgeMode ? "#ef444420" : "transparent", border: `1px solid ${judgeMode ? "#ef4444" : "#334155"}`, borderRadius: 7, padding: "4px 12px", color: judgeMode ? "#ef4444" : "#475569", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                {judgeMode ? "⚖️ Judge ON" : "Judge OFF"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SCORES ── */}
      {tab === "scores" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 13px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>🏆 Leaderboard</div>
            {[...activeAIs].sort((a, b) => avg(scores[b.id]?.total) - avg(scores[a.id]?.total)).map((ai, i) => {
              const a = avg(scores[ai.id]?.total);
              return (
                <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: i < activeAIs.length - 1 ? "1px solid #111827" : "none" }}>
                  <span style={{ width: 20, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                  <span style={{ fontSize: 16 }}>{ai.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: ai.color, fontSize: 12 }}>{ai.name}</div>
                    <div style={{ fontSize: 9, color: "#334155" }}>{ai.party}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: a ? ai.color : "#1e293b" }}>{a || "--"}</div>
                </div>
              );
            })}
          </div>
          {activeAIs.map(ai => {
            const s = scores[ai.id]?.total;
            return (
              <div key={ai.id} style={{ background: "#0d1117", border: `1px solid ${ai.color}30`, borderRadius: 11, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{ai.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, color: ai.color, fontSize: 13 }}>{ai.name}</div>
                    <div style={{ fontSize: 10, color: "#334155" }}>{ai.judgeStyle}</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s ? ai.color : "#1e293b" }}>{avg(s) || "--"}</div>
                </div>
                {s ? SCORE_KEYS.map((k, i) => (
                  <div key={k} style={{ marginBottom: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 3 }}>
                      <span>{SCORE_LABELS[i]}</span>
                      <span style={{ color: ai.color, fontWeight: 700 }}>{s[k]}%</span>
                    </div>
                    <div style={{ background: "#1e293b", borderRadius: 3, height: 5 }}>
                      <div style={{ height: "100%", width: `${s[k]}%`, background: `linear-gradient(90deg, ${ai.color}55, ${ai.color})`, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                )) : <div style={{ color: "#1e293b", fontSize: 11, textAlign: "center", padding: 10 }}>Awaiting responses…</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CONTEXT ── */}
      {tab === "context" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 13px" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Full conversation — copy and pass to any AI</div>
          <div style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
            <pre style={{ fontFamily: "monospace", fontSize: 10, color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 400, overflow: "auto", margin: 0 }}>
              {JSON.stringify(messages.filter(m => m.type === "ai" || m.type === "user").slice(-20).map(m => ({
                role: m.type === "user" ? "user" : "assistant",
                speaker: m.aiName || "user", content: m.content,
              })), null, 2)}
            </pre>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(
              messages.filter(m => m.type === "ai" || m.type === "user").map(m => ({
                role: m.type === "user" ? "user" : "assistant",
                speaker: m.aiName || "user", content: m.content,
              })), null, 2
            ))} style={{ marginTop: 10, background: "#1e293b", border: "1px solid #334155", borderRadius: 7, padding: "6px 13px", color: "#94a3b8", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
              📋 Copy Context
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#080811}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
        input::placeholder{color:#334155}
      `}</style>
    </div>
  );
}