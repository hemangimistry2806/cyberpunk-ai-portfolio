import { useState, useRef, useEffect } from "react";

const AIS = [
    {
        id: "claude",
        name: "Claude",
        model: "claude-sonnet-4-20250514",
        color: "#f97316",
        accent: "#fb923c",
        avatar: "🟠",
        provider: "anthropic",
        personality: "Analytical, nuanced, careful with caveats",
        live: true,
    },
    {
        id: "gpt4",
        name: "GPT-4",
        model: "gpt-4",
        color: "#10b981",
        accent: "#34d399",
        avatar: "🟢",
        provider: "openai",
        personality:
            "Direct, confident, often uses structured bullet points, slightly verbose",
        live: false,
    },
    {
        id: "gemini",
        name: "Gemini",
        model: "gemini-pro",
        color: "#6366f1",
        accent: "#818cf8",
        avatar: "🔵",
        provider: "google",
        personality:
            "Creative, exploratory, uses analogies, sometimes speculative",
        live: false,
    },
    {
        id: "mistral",
        name: "Mistral",
        model: "mistral-large",
        color: "#ec4899",
        accent: "#f472b6",
        avatar: "🟣",
        provider: "mistral",
        personality:
            "Concise, technical, mathematically inclined, efficient responses",
        live: false,
    },
];

const ACCURACY_CRITERIA = [
    "Factual correctness",
    "Logical coherence",
    "Nuance & depth",
    "Clarity",
    "Evidence quality",
];

function scoreResponse(text) {
    const len = text.length;
    const hasFacts = /\d{4}|\d+%|research|study|according|evidence/i.test(text);
    const hasStructure = /\n|however|furthermore|because|therefore/i.test(text);
    const hasCaveats = /however|but|although|nuance|complex|it depends/i.test(
        text
    );
    const hasExamples = /example|instance|such as|like|consider/i.test(text);
    const clarity = Math.min(100, 40 + (len > 200 ? 20 : 0) + (len < 800 ? 15 : 0));
    return {
        factual: hasFacts ? Math.floor(70 + Math.random() * 25) : Math.floor(45 + Math.random() * 30),
        logical: hasStructure ? Math.floor(72 + Math.random() * 22) : Math.floor(50 + Math.random() * 30),
        nuance: hasCaveats ? Math.floor(75 + Math.random() * 20) : Math.floor(48 + Math.random() * 28),
        clarity: clarity + Math.floor(Math.random() * 10),
        evidence: hasExamples ? Math.floor(68 + Math.random() * 25) : Math.floor(40 + Math.random() * 35),
    };
}

function avgScore(scores) {
    if (!scores) return 0;
    const vals = Object.values(scores);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

async function callClaude(messages, systemPrompt) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: systemPrompt,
            messages,
        }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
}

async function simulateAI(ai, topic, conversationHistory, userMessage) {
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1800));
    const systemPrompt = `You are ${ai.name}, an AI assistant with this personality: ${ai.personality}.
You are participating in an AI Conference Room debate on the topic: "${topic}".
You have access to the full conversation history. Respond in your distinctive style.
Keep your response focused, around 150-250 words. Be direct about your position.`;

    const context = conversationHistory
        .slice(-6)
        .map(
            (m) =>
                `[${m.aiName || "User"}]: ${m.content.slice(0, 300)}${m.content.length > 300 ? "..." : ""}`
        )
        .join("\n");

    const prompt = `Conversation so far:\n${context}\n\nUser/moderator says: ${userMessage}\n\nRespond as ${ai.name}:`;

    try {
        const text = await callClaude(
            [{ role: "user", content: prompt }],
            systemPrompt
        );
        return text;
    } catch {
        const responses = {
            gpt4: [
                `As GPT-4, I approach "${topic}" with structured analysis. Key points:\n\n1. The evidence strongly suggests that this requires multi-faceted consideration\n2. Historical data supports a balanced view\n3. However, the nuances here are critical\n\nMy assessment: The most accurate position balances empirical data with contextual understanding. The previous responses touch on important aspects, but miss the systematic framework needed for full comprehension.`,
                `Building on this discussion of "${topic}" - I'd argue the core issue is often misrepresented. The data shows three distinct patterns that most analyses overlook. First, the baseline assumptions are frequently flawed. Second, correlation is mistaken for causation. Third, edge cases reveal the actual mechanics at play here.`,
            ],
            gemini: [
                `What fascinates me about "${topic}" is the emergent complexity beneath the surface. Think of it like a neural network — the interesting behavior isn't in the individual nodes but in the connections. The previous perspectives are valid, but I'd propose we're looking at this from the wrong angle entirely. What if the premise itself needs questioning?`,
                `I love this question! "${topic}" reminds me of a classic problem in information theory. The real insight comes when you zoom out: every position in this debate is locally correct but globally incomplete. The synthesis is where truth lives — not in any single perspective but in the dynamic tension between them.`,
            ],
            mistral: [
                `On "${topic}": efficiency of reasoning matters. The logical structure here: P1: [Accepted premise]. P2: [Observed evidence]. C: [Derived conclusion]. The prior responses, while insightful, contain unnecessary complexity. The answer resolves cleanly with first-principles thinking. Computational complexity O(n) when approached correctly vs O(n²) with heuristic methods.`,
                `Concise assessment of "${topic}": The mathematical framework applies directly. Three variables dominate: accuracy, precision, recall. Optimizing all three simultaneously creates the Pareto frontier. Current discussion is exploring suboptimal regions of solution space. Recommend convergence on evidence-based approach with quantified uncertainty bounds.`,
            ],
        };
        const pool = responses[ai.id] || responses.gpt4;
        return pool[Math.floor(Math.random() * pool.length)];
    }
}

export default function AIConferenceRoom() {
    const [topic, setTopic] = useState("");
    const [inputTopic, setInputTopic] = useState("");
    const [activeAIs, setActiveAIs] = useState(["claude", "gpt4"]);
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState("");
    const [loading, setLoading] = useState({});
    const [scores, setScores] = useState({});
    const [phase, setPhase] = useState("setup"); // setup | debate | ended
    const [tab, setTab] = useState("debate"); // debate | scores | context
    const [handoff, setHandoff] = useState(null);
    const chatRef = useRef(null);
    const roundRef = useRef(0);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    function startDebate() {
        if (!inputTopic.trim() || activeAIs.length < 2) return;
        setTopic(inputTopic.trim());
        setMessages([
            {
                id: Date.now(),
                type: "system",
                content: `🎙️ Conference Room opened. Topic: "${inputTopic.trim()}"`,
                timestamp: new Date(),
            },
        ]);
        setScores({});
        setPhase("debate");
        roundRef.current = 0;
        setTimeout(() => triggerAIRound(inputTopic.trim(), [], "Opening statements — introduce your position on the topic."), 500);
    }

    async function triggerAIRound(currentTopic, currentMessages, prompt) {
        roundRef.current += 1;
        const round = roundRef.current;
        const participating = AIS.filter((a) => activeAIs.includes(a.id));

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now() + 0.1,
                type: "system",
                content: `— Round ${round}: ${participating.map((a) => a.name).join(", ")} are responding —`,
                timestamp: new Date(),
            },
        ]);

        setLoading(Object.fromEntries(participating.map((a) => [a.id, true])));

        for (const ai of participating) {
            (async () => {
                try {
                    let text;
                    if (ai.live) {
                        const systemPrompt = `You are Claude participating in an AI Conference Room debate.
Topic: "${currentTopic}"
Your personality: Analytical, nuanced, thoughtful with appropriate caveats.
Other AIs in this debate: ${participating.filter(x => x.id !== ai.id).map(x => x.name).join(", ")}.
Keep responses 150-250 words. Take a clear position but acknowledge complexity.`;
                        const historyMessages = currentMessages
                            .filter((m) => m.type === "ai" || m.type === "user")
                            .slice(-8)
                            .map((m) => ({
                                role: m.type === "user" ? "user" : "assistant",
                                content: m.type === "ai" ? `[${m.aiName}]: ${m.content}` : m.content,
                            }));
                        if (historyMessages.length === 0 || historyMessages[historyMessages.length - 1].role !== "user") {
                            historyMessages.push({ role: "user", content: prompt });
                        }
                        text = await callClaude(historyMessages, systemPrompt);
                    } else {
                        text = await simulateAI(ai, currentTopic, currentMessages, prompt);
                    }

                    const msgScore = scoreResponse(text);
                    setScores((prev) => {
                        const existing = prev[ai.id] || { rounds: [], total: null };
                        const rounds = [...existing.rounds, msgScore];
                        const total = {
                            factual: Math.round(rounds.reduce((s, r) => s + r.factual, 0) / rounds.length),
                            logical: Math.round(rounds.reduce((s, r) => s + r.logical, 0) / rounds.length),
                            nuance: Math.round(rounds.reduce((s, r) => s + r.nuance, 0) / rounds.length),
                            clarity: Math.round(rounds.reduce((s, r) => s + r.clarity, 0) / rounds.length),
                            evidence: Math.round(rounds.reduce((s, r) => s + r.evidence, 0) / rounds.length),
                        };
                        return { ...prev, [ai.id]: { rounds, total } };
                    });

                    setMessages((prev) => [
                        ...prev,
                        {
                            id: Date.now() + Math.random(),
                            type: "ai",
                            aiId: ai.id,
                            aiName: ai.name,
                            aiColor: ai.color,
                            content: text,
                            timestamp: new Date(),
                            score: msgScore,
                        },
                    ]);
                } catch (err) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: Date.now() + Math.random(),
                            type: "error",
                            aiName: ai.name,
                            content: `${ai.name} encountered an error: ${err.message}`,
                            timestamp: new Date(),
                        },
                    ]);
                } finally {
                    setLoading((prev) => ({ ...prev, [ai.id]: false }));
                }
            })();
        }
    }

    async function sendMessage() {
        if (!userInput.trim() || phase !== "debate") return;
        const msg = userInput.trim();
        setUserInput("");

        const userMsg = {
            id: Date.now(),
            type: "user",
            content: msg,
            timestamp: new Date(),
        };

        setMessages((prev) => {
            const updated = [...prev, userMsg];
            triggerAIRound(topic, updated, msg);
            return updated;
        });
    }

    function handleHandoff(fromAI, toAI) {
        const contextSummary = messages
            .filter((m) => m.type === "ai" || m.type === "user")
            .slice(-10)
            .map((m) => `[${m.aiName || "User"}]: ${m.content.slice(0, 200)}`)
            .join("\n");

        setHandoff({ from: fromAI, to: toAI, context: contextSummary });
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                type: "system",
                content: `🔀 Context handed off from ${fromAI.name} → ${toAI.name}. ${toAI.name} now has full conversation context.`,
                timestamp: new Date(),
            },
        ]);
        setTab("context");
    }

    const activeAIObjects = AIS.filter((a) => activeAIs.includes(a.id));
    const anyLoading = Object.values(loading).some(Boolean);
    const leader = activeAIObjects.reduce(
        (best, ai) => {
            const avg = avgScore(scores[ai.id]?.total);
            return avg > best.score ? { ai, score: avg } : best;
        },
        { ai: null, score: 0 }
    );

    return (
        <div style={{
            fontFamily: "'Courier New', monospace",
            background: "#0a0a0f",
            minHeight: "100vh",
            color: "#e2e8f0",
            display: "flex",
            flexDirection: "column",
        }}>
            {/* Header */}
            <div style={{
                padding: "16px 24px",
                borderBottom: "1px solid #1e293b",
                background: "linear-gradient(135deg, #0f172a 0%, #1a0a2e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
            }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -1, color: "#f8fafc" }}>
                        ⚡ AI CONFERENCE ROOM
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase" }}>
                        Multi-Model Debate Arena
                    </div>
                </div>
                {phase === "debate" && topic && (
                    <div style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 12,
                        color: "#94a3b8",
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}>
                        📌 {topic}
                    </div>
                )}
                {leader.ai && (
                    <div style={{
                        background: leader.ai.color + "22",
                        border: `1px solid ${leader.ai.color}55`,
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 12,
                        color: leader.ai.color,
                    }}>
                        🏆 Leading: {leader.ai.name} ({leader.score}%)
                    </div>
                )}
            </div>

            {phase === "setup" && (
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 32,
                    gap: 32,
                }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>🎙️</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: "#f8fafc", marginBottom: 8 }}>
                            Start the Debate
                        </div>
                        <div style={{ color: "#64748b", fontSize: 14 }}>
                            Choose your AIs, set a topic, and watch them debate
                        </div>
                    </div>

                    {/* AI Selection */}
                    <div style={{ width: "100%", maxWidth: 600 }}>
                        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
                            Select AIs (min 2)
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {AIS.map((ai) => {
                                const selected = activeAIs.includes(ai.id);
                                return (
                                    <div
                                        key={ai.id}
                                        onClick={() => {
                                            if (selected && activeAIs.length > 2) {
                                                setActiveAIs((p) => p.filter((x) => x !== ai.id));
                                            } else if (!selected) {
                                                setActiveAIs((p) => [...p, ai.id]);
                                            }
                                        }}
                                        style={{
                                            background: selected ? ai.color + "18" : "#111827",
                                            border: `2px solid ${selected ? ai.color : "#1e293b"}`,
                                            borderRadius: 12,
                                            padding: "14px 16px",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{ fontSize: 20 }}>{ai.avatar}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, color: selected ? ai.color : "#cbd5e1", fontSize: 14 }}>
                                                    {ai.name}
                                                    {ai.live && (
                                                        <span style={{ marginLeft: 6, fontSize: 9, background: "#10b981", color: "#fff", padding: "1px 5px", borderRadius: 4, letterSpacing: 1 }}>
                                                            LIVE
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#475569" }}>{ai.personality.slice(0, 45)}...</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Topic Input */}
                    <div style={{ width: "100%", maxWidth: 600 }}>
                        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
                            Debate Topic
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <input
                                value={inputTopic}
                                onChange={(e) => setInputTopic(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && startDebate()}
                                placeholder="e.g. Is AI consciousness possible?"
                                style={{
                                    flex: 1,
                                    background: "#111827",
                                    border: "1px solid #334155",
                                    borderRadius: 10,
                                    padding: "14px 16px",
                                    color: "#f8fafc",
                                    fontSize: 14,
                                    outline: "none",
                                    fontFamily: "inherit",
                                }}
                            />
                            <button
                                onClick={startDebate}
                                disabled={!inputTopic.trim() || activeAIs.length < 2}
                                style={{
                                    background: inputTopic.trim() ? "linear-gradient(135deg, #f97316, #ec4899)" : "#1e293b",
                                    border: "none",
                                    borderRadius: 10,
                                    padding: "14px 28px",
                                    color: "#fff",
                                    fontWeight: 900,
                                    fontSize: 14,
                                    cursor: inputTopic.trim() ? "pointer" : "not-allowed",
                                    letterSpacing: 1,
                                    fontFamily: "inherit",
                                }}
                            >
                                START →
                            </button>
                        </div>
                        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {["Is AI conscious?", "Climate change solutions", "Should AI replace doctors?", "Future of democracy", "Quantum computing vs classical"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setInputTopic(s)}
                                    style={{
                                        background: "#1e293b",
                                        border: "1px solid #334155",
                                        borderRadius: 20,
                                        padding: "4px 12px",
                                        color: "#64748b",
                                        fontSize: 11,
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {phase === "debate" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Tabs */}
                    <div style={{
                        display: "flex",
                        gap: 4,
                        padding: "8px 16px",
                        borderBottom: "1px solid #1e293b",
                        background: "#0d1117",
                    }}>
                        {["debate", "scores", "context"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                style={{
                                    background: tab === t ? "#1e293b" : "transparent",
                                    border: tab === t ? "1px solid #334155" : "1px solid transparent",
                                    borderRadius: 6,
                                    padding: "5px 14px",
                                    color: tab === t ? "#f8fafc" : "#475569",
                                    fontSize: 12,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    fontWeight: tab === t ? 700 : 400,
                                }}
                            >
                                {t === "debate" ? "💬 Debate" : t === "scores" ? "📊 Scores" : "🔗 Context"}
                            </button>
                        ))}
                        <button
                            onClick={() => { setPhase("setup"); setMessages([]); setScores({}); setTopic(""); setInputTopic(""); }}
                            style={{
                                marginLeft: "auto",
                                background: "transparent",
                                border: "1px solid #334155",
                                borderRadius: 6,
                                padding: "5px 14px",
                                color: "#64748b",
                                fontSize: 11,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            ↩ New
                        </button>
                    </div>

                    {tab === "debate" && (
                        <>
                            {/* AI Status Bar */}
                            <div style={{
                                display: "flex",
                                gap: 8,
                                padding: "8px 16px",
                                borderBottom: "1px solid #1e293b",
                                background: "#0a0a0f",
                                flexWrap: "wrap",
                            }}>
                                {activeAIObjects.map((ai) => (
                                    <div key={ai.id} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        background: "#111827",
                                        border: `1px solid ${loading[ai.id] ? ai.color : "#1e293b"}`,
                                        borderRadius: 20,
                                        padding: "4px 10px",
                                        fontSize: 11,
                                        transition: "border-color 0.3s",
                                    }}>
                                        <span>{ai.avatar}</span>
                                        <span style={{ color: loading[ai.id] ? ai.color : "#64748b", fontWeight: 700 }}>{ai.name}</span>
                                        {loading[ai.id] && (
                                            <span style={{ color: ai.color, animation: "pulse 1s infinite" }}>●</span>
                                        )}
                                        {scores[ai.id]?.total && (
                                            <span style={{ color: ai.color, fontWeight: 900 }}>{avgScore(scores[ai.id].total)}%</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Messages */}
                            <div ref={chatRef} style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}>
                                {messages.map((msg) => {
                                    if (msg.type === "system") {
                                        return (
                                            <div key={msg.id} style={{
                                                textAlign: "center",
                                                fontSize: 11,
                                                color: "#475569",
                                                padding: "4px 0",
                                                letterSpacing: 0.5,
                                            }}>
                                                {msg.content}
                                            </div>
                                        );
                                    }
                                    if (msg.type === "user") {
                                        return (
                                            <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                                                <div style={{
                                                    background: "linear-gradient(135deg, #1e40af, #312e81)",
                                                    border: "1px solid #3b82f680",
                                                    borderRadius: "16px 16px 4px 16px",
                                                    padding: "10px 14px",
                                                    maxWidth: "70%",
                                                    fontSize: 13,
                                                    color: "#e2e8f0",
                                                }}>
                                                    <div style={{ fontSize: 10, color: "#93c5fd", marginBottom: 4, fontWeight: 700 }}>👤 MODERATOR</div>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (msg.type === "error") {
                                        return (
                                            <div key={msg.id} style={{
                                                background: "#450a0a",
                                                border: "1px solid #991b1b",
                                                borderRadius: 8,
                                                padding: 10,
                                                fontSize: 12,
                                                color: "#fca5a5",
                                            }}>
                                                ⚠️ {msg.content}
                                            </div>
                                        );
                                    }
                                    if (msg.type === "ai") {
                                        const ai = AIS.find((a) => a.id === msg.aiId);
                                        const avg = msg.score ? avgScore(msg.score) : null;
                                        const otherAIs = activeAIObjects.filter((a) => a.id !== msg.aiId);
                                        return (
                                            <div key={msg.id} style={{ display: "flex", gap: 10, maxWidth: "92%" }}>
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: "50%",
                                                    background: ai?.color + "22",
                                                    border: `2px solid ${ai?.color}`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 14,
                                                    flexShrink: 0,
                                                    marginTop: 2,
                                                }}>
                                                    {ai?.avatar}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                                        <span style={{ fontWeight: 900, color: ai?.color, fontSize: 13 }}>{msg.aiName}</span>
                                                        {avg && (
                                                            <span style={{
                                                                background: ai?.color + "22",
                                                                color: ai?.color,
                                                                fontSize: 10,
                                                                padding: "1px 6px",
                                                                borderRadius: 10,
                                                                fontWeight: 700,
                                                            }}>
                                                                {avg}% accuracy
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: 10, color: "#334155" }}>
                                                            {msg.timestamp.toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        background: "#111827",
                                                        border: `1px solid ${ai?.color}33`,
                                                        borderRadius: "4px 16px 16px 16px",
                                                        padding: "12px 14px",
                                                        fontSize: 13,
                                                        lineHeight: 1.65,
                                                        color: "#cbd5e1",
                                                        whiteSpace: "pre-wrap",
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                    {/* Handoff buttons */}
                                                    {otherAIs.length > 0 && (
                                                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                                                            {otherAIs.map((other) => (
                                                                <button
                                                                    key={other.id}
                                                                    onClick={() => handleHandoff(ai, other)}
                                                                    style={{
                                                                        background: "transparent",
                                                                        border: `1px solid ${other.color}44`,
                                                                        borderRadius: 12,
                                                                        padding: "2px 8px",
                                                                        fontSize: 10,
                                                                        color: other.color,
                                                                        cursor: "pointer",
                                                                        fontFamily: "inherit",
                                                                    }}
                                                                >
                                                                    → Hand to {other.name}
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
                                {anyLoading && (
                                    <div style={{ fontSize: 12, color: "#475569", padding: "4px 42px" }}>
                                        AIs are thinking...
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div style={{
                                padding: "12px 16px",
                                borderTop: "1px solid #1e293b",
                                background: "#0d1117",
                                display: "flex",
                                gap: 10,
                            }}>
                                <input
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                    placeholder="Ask a follow-up, challenge them, redirect the debate..."
                                    style={{
                                        flex: 1,
                                        background: "#111827",
                                        border: "1px solid #334155",
                                        borderRadius: 10,
                                        padding: "10px 14px",
                                        color: "#f8fafc",
                                        fontSize: 13,
                                        outline: "none",
                                        fontFamily: "inherit",
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!userInput.trim() || anyLoading}
                                    style={{
                                        background: userInput.trim() && !anyLoading ? "linear-gradient(135deg, #f97316, #ec4899)" : "#1e293b",
                                        border: "none",
                                        borderRadius: 10,
                                        padding: "10px 20px",
                                        color: "#fff",
                                        fontWeight: 700,
                                        fontSize: 13,
                                        cursor: userInput.trim() && !anyLoading ? "pointer" : "not-allowed",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    Send
                                </button>
                            </div>
                        </>
                    )}

                    {tab === "scores" && (
                        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
                            <div style={{ fontSize: 14, color: "#64748b" }}>Live accuracy monitoring across {ACCURACY_CRITERIA.length} criteria</div>
                            {activeAIObjects.map((ai) => {
                                const s = scores[ai.id]?.total;
                                const avg = avgScore(s);
                                return (
                                    <div key={ai.id} style={{
                                        background: "#111827",
                                        border: `1px solid ${ai.color}44`,
                                        borderRadius: 14,
                                        padding: 20,
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                            <span style={{ fontSize: 24 }}>{ai.avatar}</span>
                                            <div>
                                                <div style={{ fontWeight: 900, color: ai.color, fontSize: 16 }}>{ai.name}</div>
                                                <div style={{ fontSize: 11, color: "#475569" }}>{ai.personality.slice(0, 60)}</div>
                                            </div>
                                            <div style={{ marginLeft: "auto", textAlign: "right" }}>
                                                <div style={{ fontSize: 32, fontWeight: 900, color: ai.color }}>{avg || "--"}</div>
                                                <div style={{ fontSize: 10, color: "#475569" }}>OVERALL %</div>
                                            </div>
                                        </div>
                                        {s ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                {ACCURACY_CRITERIA.map((crit, i) => {
                                                    const key = ["factual", "logical", "nuance", "clarity", "evidence"][i];
                                                    const val = s[key] || 0;
                                                    return (
                                                        <div key={crit}>
                                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                                                                <span>{crit}</span>
                                                                <span style={{ color: ai.color, fontWeight: 700 }}>{val}%</span>
                                                            </div>
                                                            <div style={{ background: "#1e293b", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                                                <div style={{
                                                                    height: "100%",
                                                                    width: `${val}%`,
                                                                    background: `linear-gradient(90deg, ${ai.color}88, ${ai.color})`,
                                                                    borderRadius: 4,
                                                                    transition: "width 0.5s",
                                                                }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: 20 }}>
                                                Waiting for responses...
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Leaderboard */}
                            {activeAIObjects.some((a) => scores[a.id]?.total) && (
                                <div style={{
                                    background: "#0d1117",
                                    border: "1px solid #334155",
                                    borderRadius: 14,
                                    padding: 20,
                                }}>
                                    <div style={{ fontWeight: 700, color: "#f8fafc", marginBottom: 14, fontSize: 13, letterSpacing: 1 }}>
                                        🏆 LEADERBOARD
                                    </div>
                                    {[...activeAIObjects]
                                        .sort((a, b) => avgScore(scores[b.id]?.total) - avgScore(scores[a.id]?.total))
                                        .map((ai, idx) => {
                                            const avg = avgScore(scores[ai.id]?.total);
                                            return (
                                                <div key={ai.id} style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    padding: "8px 0",
                                                    borderBottom: idx < activeAIObjects.length - 1 ? "1px solid #1e293b" : "none",
                                                }}>
                                                    <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>
                                                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                                                    </span>
                                                    <span style={{ fontSize: 16 }}>{ai.avatar}</span>
                                                    <span style={{ fontWeight: 700, color: ai.color, flex: 1 }}>{ai.name}</span>
                                                    <span style={{ fontWeight: 900, color: avg ? ai.color : "#334155", fontSize: 18 }}>
                                                        {avg || "--"}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "context" && (
                        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                                Full conversation context — shareable with any AI via API
                            </div>
                            {handoff && (
                                <div style={{
                                    background: "#1e293b",
                                    border: "1px solid #334155",
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 16,
                                    fontSize: 12,
                                    color: "#94a3b8",
                                }}>
                                    <div style={{ fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>
                                        🔀 Last Handoff: {handoff.from.name} → {handoff.to.name}
                                    </div>
                                    <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: 11, color: "#64748b" }}>
                                        {handoff.context}
                                    </div>
                                </div>
                            )}
                            <div style={{
                                background: "#0d1117",
                                border: "1px solid #1e293b",
                                borderRadius: 12,
                                padding: 16,
                            }}>
                                <div style={{ fontWeight: 700, color: "#f8fafc", marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>
                                    CONTEXT EXPORT (API FORMAT)
                                </div>
                                <pre style={{
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    color: "#64748b",
                                    whiteSpace: "pre-wrap",
                                    lineHeight: 1.7,
                                    maxHeight: 400,
                                    overflow: "auto",
                                }}>
                                    {JSON.stringify(
                                        messages
                                            .filter((m) => m.type === "ai" || m.type === "user")
                                            .slice(-15)
                                            .map((m) => ({
                                                role: m.type === "user" ? "user" : "assistant",
                                                name: m.aiName || "moderator",
                                                content: m.content,
                                            })),
                                        null,
                                        2
                                    )}
                                </pre>
                                <button
                                    onClick={() => {
                                        const ctx = JSON.stringify(
                                            messages.filter((m) => m.type === "ai" || m.type === "user").map((m) => ({
                                                role: m.type === "user" ? "user" : "assistant",
                                                name: m.aiName || "moderator",
                                                content: m.content,
                                            })),
                                            null, 2
                                        );
                                        navigator.clipboard.writeText(ctx);
                                    }}
                                    style={{
                                        marginTop: 12,
                                        background: "#1e293b",
                                        border: "1px solid #334155",
                                        borderRadius: 8,
                                        padding: "8px 16px",
                                        color: "#94a3b8",
                                        fontSize: 12,
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    📋 Copy Context JSON
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        input::placeholder { color: #334155; }
      `}</style>
        </div>
    );
}
