"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, RoleBadge, Spinner, Tag, SectionLabel } from "@/components/ui";
import type { ForgeUser } from "@/lib/types";

type AppMode = "paper" | "saas" | "constellation";

const AVAILABLE_MODELS = [
    { id: "amazon:amazon.nova-pro-v1:0", name: "Nova Pro", provider: "amazon" },
    { id: "amazon:amazon.nova-lite-v1:0", name: "Nova 2 Lite", provider: "amazon" },
];

interface Session {
    id: string;
    mode: AppMode;
    title: string;
    timestamp: string;
    arxivId?: string;
    meta?: ArxivMeta;
    data?: AnalysisData;
    error?: string;
}

interface ArxivMeta {
    title: string;
    abstract: string;
    authors: string[];
    published: string;
    arxivId?: string;
}

interface AnalysisData {
    output: unknown;
    outputText?: string;
}

const extractArxivId = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/);
    if (match) return match[1];
    const simpleMatch = trimmed.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/);
    if (simpleMatch) return simpleMatch[1];
    return null;
};

const safeJsonParse = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
};

const trimTitle = (value: string): string => {
    if (value.length <= 68) return value;
    return `${value.slice(0, 68)}...`;
};

const formatOutput = (value: unknown): string => {
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
};

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<ForgeUser | null>(null);
    const [mode, setMode] = useState<AppMode>("paper");
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [streamOutput, setStreamOutput] = useState("");
    const [error, setError] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("forge-user");
        if (!storedUser) {
            router.replace("/");
            return;
        }

        try {
            setUser(JSON.parse(storedUser));
        } catch {
            router.replace("/");
            return;
        }

        const storedSessions = localStorage.getItem("forge-sessions");
        if (!storedSessions) return;

        try {
            const parsed = JSON.parse(storedSessions);
            if (Array.isArray(parsed)) setSessions(parsed as Session[]);
        } catch {
            localStorage.removeItem("forge-sessions");
        }
    }, [router]);

    const persistSessions = (next: Session[]) => {
        setSessions(next);
        localStorage.setItem("forge-sessions", JSON.stringify(next));
    };

    const upsertSession = (session: Session) => {
        setSessions((prev) => {
            const next = [session, ...prev.filter((s) => s.id !== session.id)];
            localStorage.setItem("forge-sessions", JSON.stringify(next));
            return next;
        });
    };

    const patchSession = (sessionId: string, patch: Partial<Session>) => {
        setSessions((prev) => {
            const existing = prev.find((s) => s.id === sessionId);
            if (!existing) return prev;
            const updated = { ...existing, ...patch };
            const next = [updated, ...prev.filter((s) => s.id !== sessionId)];
            localStorage.setItem("forge-sessions", JSON.stringify(next));
            return next;
        });
    };

    const deleteSession = (sessionId: string) => {
        const updated = sessions.filter((s) => s.id !== sessionId);
        persistSessions(updated);
        if (currentSessionId === sessionId) {
            setCurrentSessionId(updated[0]?.id ?? null);
        }
    };

    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const detectedArxivId = extractArxivId(input);

    const readStreamingResponse = async (res: Response) => {
        if (!res.ok || !res.body) {
            let message = `Request failed (${res.status})`;
            try {
                const payload = await res.json();
                if (payload?.error) message = payload.error;
            } catch {
                // no-op
            }
            throw new Error(message);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalOutput: unknown = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;

                const rawData = line.slice(6).trim();
                if (!rawData) continue;

                let payload: any;
                try {
                    payload = JSON.parse(rawData);
                } catch {
                    continue;
                }

                if (payload.type === "delta" && typeof payload.text === "string") {
                    setStreamOutput(payload.text);
                }

                if (payload.type === "error") {
                    throw new Error(payload.message || "Backend returned an error.");
                }

                if (payload.type === "done") {
                    finalOutput = payload.analysis ?? payload.text ?? payload;
                }
            }
        }

        return finalOutput;
    };

    const handleAnalyze = async (manualId?: string, manualMode?: AppMode, manualInput?: string) => {
        const targetMode = manualMode || mode;
        const targetInput = (manualInput || input).trim();
        if (!targetInput && !manualId) return;

        setError("");
        setAnalyzing(true);
        setProgress(7);
        setStreamOutput("");

        const progressInterval = setInterval(() => {
            setProgress((p) => (p >= 92 ? p : p + 7));
        }, 420);

        const startedAt = new Date().toISOString();
        let activeSessionId: string | null = null;

        try {
            if (targetMode === "paper") {
                const arxivId = manualId || extractArxivId(targetInput);
                if (!arxivId) {
                    throw new Error("Paper mode requires a valid arXiv ID or URL.");
                }

                setStatusText("Fetching arXiv metadata");
                const metaRes = await fetch(`/api/arxiv?id=${encodeURIComponent(arxivId)}`);
                if (!metaRes.ok) {
                    const metaErr = await metaRes.json().catch(() => ({}));
                    throw new Error(metaErr?.error || "Failed to fetch arXiv metadata.");
                }

                const meta = (await metaRes.json()) as ArxivMeta;
                const sessionId = arxivId;
                const session: Session = {
                    id: sessionId,
                    mode: targetMode,
                    title: trimTitle(meta.title || `Research: ${arxivId}`),
                    timestamp: startedAt,
                    arxivId,
                    meta,
                };

                upsertSession(session);
                activeSessionId = sessionId;
                setCurrentSessionId(sessionId);
                setInput("");

                setStatusText("Running Forge Analyst");
                const analyzeRes = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...meta, arxivId, model: selectedModel }),
                });

                const final = await readStreamingResponse(analyzeRes);
                patchSession(sessionId, {
                    data: {
                        output: typeof final === "string" ? safeJsonParse(final) : final,
                        outputText: typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
            }

            if (targetMode === "saas") {
                const sessionId = `saas_${Date.now()}`;
                const session: Session = {
                    id: sessionId,
                    mode: targetMode,
                    title: trimTitle(`SaaS: ${targetInput}`),
                    timestamp: startedAt,
                };

                upsertSession(session);
                activeSessionId = sessionId;
                setCurrentSessionId(sessionId);
                setInput("");

                setStatusText("Researching related papers");
                const saasRes = await fetch("/api/analyze-saas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ description: targetInput, model: selectedModel }),
                });

                const final = await readStreamingResponse(saasRes);
                patchSession(sessionId, {
                    data: {
                        output: typeof final === "string" ? safeJsonParse(final) : final,
                        outputText: typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
            }

            if (targetMode === "constellation") {
                const sessionId = `constellation_${Date.now()}`;
                const session: Session = {
                    id: sessionId,
                    mode: targetMode,
                    title: trimTitle(`Constellation: ${targetInput}`),
                    timestamp: startedAt,
                };

                upsertSession(session);
                activeSessionId = sessionId;
                setCurrentSessionId(sessionId);
                setInput("");

                setStatusText("Running market and competitor scan");
                const competitorRes = await fetch("/api/analyze-competitors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ideaContext: targetInput, model: selectedModel }),
                });

                const final = await readStreamingResponse(competitorRes);
                patchSession(sessionId, {
                    data: {
                        output: typeof final === "string" ? safeJsonParse(final) : final,
                        outputText: typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
            }

            setStatusText("Complete");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Analysis failed.";
            setError(message);
            if (activeSessionId) {
                patchSession(activeSessionId, { error: message });
            }
        } finally {
            clearInterval(progressInterval);
            setProgress(100);
            setTimeout(() => setProgress(0), 300);
            setAnalyzing(false);
        }
    };

    return (
        <div className="h-screen flex lp-shell text-[#17130c] overflow-hidden font-sans">
            <aside className={`border-r border-[#e8dfcf] bg-[#f4ebd9]/90 backdrop-blur flex flex-col transition-all duration-300 ${sidebarOpen ? "w-72" : "w-0 opacity-0 -translate-x-full"}`}>
                <div className="p-4 border-b border-[#e8dfcf] flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="font-extrabold text-lg tracking-tighter">FORGE</span>
                        <span className="text-[#e86f2d] text-xl">⬡</span>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="text-[#6b5b3f] hover:text-[#17130c] p-1" aria-label="Collapse sidebar">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                </div>

                <div className="p-3">
                    <button
                        onClick={() => { setCurrentSessionId(null); setInput(""); setStreamOutput(""); setError(""); }}
                        className="lp-btn-secondary w-full flex items-center justify-start gap-3 border-dashed px-3 py-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Forge Session
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                    <div className="px-3 py-2">
                        <SectionLabel>Recent Operations</SectionLabel>
                    </div>
                    {sessions.length === 0 ? (
                        <div className="px-3 py-8 text-center space-y-2">
                            <div className="text-[#9c8e74] text-2xl">📁</div>
                            <p className="text-[#8a7a5d] text-[0.7rem] font-mono uppercase tracking-widest">No history recorded</p>
                        </div>
                    ) : (
                        sessions.map((s) => (
                            <div
                                key={s.id}
                                className={`w-full p-1 rounded-lg transition-all border ${
                                    currentSessionId === s.id ? "bg-[#fff5e2] border-[#eec681]" : "hover:bg-[#f8efde] border-transparent"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setCurrentSessionId(s.id);
                                            setError(s.error || "");
                                            setStreamOutput("");
                                        }}
                                        className="flex-1 text-left p-2 rounded-md flex items-center gap-3"
                                    >
                                        <span className="text-[0.8rem] opacity-50">{s.mode === "paper" ? "📄" : s.mode === "constellation" ? "✨" : "💼"}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-[0.75rem] font-medium truncate ${currentSessionId === s.id ? "text-[#b2541f]" : "text-[#17130c]"}`}>{s.title}</div>
                                            <div className="text-[0.6rem] text-[#8a7a5d] font-mono uppercase">{new Date(s.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSession(s.id);
                                        }}
                                        className="shrink-0 h-8 w-8 rounded-md text-[#8a7a5d] hover:text-[#17130c] hover:bg-[#efe4d0]"
                                        aria-label="Delete session"
                                        title="Delete session"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-[#e8dfcf] bg-[#f0e6d2]">
                    <div className="flex items-center gap-3">
                        <Avatar name={user?.name || "O"} role={user?.role || "builder"} size={28} />
                        <div className="min-w-0">
                            <div className="text-[0.75rem] font-bold truncate">{user?.name}</div>
                            <RoleBadge role={user?.role || "builder"} />
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-[0.08] pointer-events-none" />

                <header className="h-14 border-b border-[#e8dfcf] flex items-center justify-between px-6 bg-[#f7f3ea]/90 backdrop-blur z-10">
                    <div className="flex items-center gap-4">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} className="text-[#6b5b3f] hover:text-[#17130c] p-1" aria-label="Expand sidebar">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="bg-transparent text-[0.7rem] font-mono text-[#6b5b3f] hover:text-[#17130c] cursor-pointer border-none outline-none appearance-none uppercase tracking-widest"
                            >
                                {AVAILABLE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <span className="text-[#8a7a5d]">/</span>
                            <span className="text-[0.65rem] font-mono text-[#8a7a5d] uppercase tracking-widest">{mode} MODE</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="lp-btn-secondary h-8 px-3 text-[0.65rem]" onClick={() => setCurrentSessionId(null)}>
                            New Session
                        </button>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 relative">
                    {currentSession ? (
                        <div className="max-w-4xl mx-auto space-y-8 pb-32">
                            <div className="flex flex-col gap-2">
                                <div className="text-[#b2541f] text-sm font-mono uppercase tracking-[0.2em] mb-2 animate-in">Session Active</div>
                                <h1 className="text-3xl font-extrabold tracking-tighter animate-in" style={{ animationDelay: "0.1s" }}>
                                    {currentSession.title}
                                </h1>
                                <div className="flex gap-2 animate-in" style={{ animationDelay: "0.15s" }}>
                                    <Tag text={currentSession.mode.toUpperCase()} color="#b2541f" />
                                    {currentSession.arxivId ? <Tag text={`arXiv:${currentSession.arxivId}`} color="#2f8b6b" /> : null}
                                </div>
                            </div>

                            {analyzing ? (
                                <div className="lp-card p-12 flex flex-col items-center justify-center text-center space-y-4">
                                    <Spinner size={32} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-mono text-[#b2541f] animate-pulse uppercase tracking-widest">{statusText || "Running Analysis..."}</p>
                                        <p className="text-xs text-[#6b5b3f] font-light">Streaming from Agno backend at localhost:8321</p>
                                    </div>
                                    <div className="w-full max-w-xs h-1 bg-[#e7dac2] rounded-full overflow-hidden mt-4">
                                        <div className="h-full bg-[#e86f2d] transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            ) : !currentSession.data ? (
                                <div className="lp-card p-8 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="text-[#8a7a5d] text-3xl">📡</div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold uppercase tracking-widest">Awaiting Command</h3>
                                        <p className="text-xs text-[#8a7a5d]">Click Initialize Forge below to run this session.</p>
                                    </div>
                                    <button onClick={() => handleAnalyze(currentSession.arxivId, currentSession.mode, input || currentSession.title)} className="lp-btn-primary px-4 py-2">Initialize Forge</button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in">
                                    <div className="lp-card p-6">
                                        <SectionLabel>Backend Output</SectionLabel>
                                        <pre className="text-[#3f3525] text-xs leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                                            {formatOutput(currentSession.data.output)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {streamOutput ? (
                                <div className="lp-card p-5">
                                    <SectionLabel>Live Stream</SectionLabel>
                                    <pre className="text-[#5b4e37] text-xs leading-relaxed whitespace-pre-wrap break-words max-h-56 overflow-auto">{streamOutput}</pre>
                                </div>
                            ) : null}

                            {(error || currentSession.error) ? (
                                <div className="rounded-xl border border-[#d9a9a9] bg-[#f7e8e8] text-[#8d2f2f] p-4 text-sm">
                                    {error || currentSession.error}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center px-6">
                            <div className="text-[#e86f2d] text-5xl mb-8 font-mono">⬡</div>
                            <h2 className="text-4xl font-extrabold tracking-tighter mb-4 max-w-md">
                                What should we <span className="text-[#e86f2d] font-mono italic">forge</span> today?
                            </h2>
                            <p className="text-[#5b4e37] text-sm max-w-sm mb-12 font-light">
                                Ingest an arXiv paper or describe a product and run the Agno backend from this dashboard.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                                {[
                                    { t: "Extract SaaS Moats", d: "2409.13449", m: "paper" as AppMode },
                                    { t: "SaaS R&D Boost", d: "A B2B CRM for biotech", m: "saas" as AppMode },
                                    { t: "Constellation Map", d: "AI copilots for SOC workflows", m: "constellation" as AppMode }
                                ].map((ex, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setMode(ex.m); setInput(ex.d); }}
                                        className="lp-card p-4 text-left hover:border-[#eec681] transition-all group"
                                    >
                                        <div className="text-xs font-mono text-[#b2541f] uppercase mb-1 tracking-widest">{ex.m}</div>
                                        <div className="text-xs font-bold mb-1">{ex.t}</div>
                                        <div className="text-[0.65rem] text-[#8a7a5d] font-mono">&quot;{ex.d}&quot;</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gradient-to-t from-[#f3ead8] via-[#f6efe1]/95 to-transparent border-t border-[#e8dfcf] relative z-10">
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="flex justify-center gap-1.5 mb-2">
                            {(["paper", "constellation", "saas"] as AppMode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-3 py-1 rounded-full text-[0.6rem] font-mono uppercase tracking-[0.2em] transition-all border ${
                                        mode === m ? "bg-[#e86f2d] text-[#fff8eb] border-[#e86f2d] font-bold" : "bg-[#fdf8ed] text-[#6b5b3f] border-[#e5d9c3] hover:text-[#17130c]"
                                    }`}
                                >
                                    {m === "constellation" ? "✨ Constell" : m === "paper" ? "📄 Ingest" : "💼 SaaS"}
                                </button>
                            ))}
                        </div>

                        <div className="lp-card p-1.5 focus-within:border-[#eec681] transition-all shadow-[0_20px_50px_-35px_rgba(23,19,12,0.4)]">
                            <div className="flex flex-col gap-2">
                                {detectedArxivId && (
                                    <div className="px-3 pt-2">
                                        <span className="inline-flex items-center gap-2 bg-[#fdf0df] border border-[#f0cb94] rounded px-2 py-1 text-[0.65rem] font-mono text-[#b2541f] animate-in">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#e86f2d] animate-pulse" />
                                            TARGET ARXIV:{detectedArxivId}
                                            <button onClick={() => setInput(input.replace(detectedArxivId, ""))} className="hover:text-[#17130c] ml-1 text-xs">×</button>
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-end gap-2 p-2">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAnalyze();
                                            }
                                        }}
                                        placeholder={
                                            mode === "paper" ? "Input ArXiv ID or URL to distill blueprint..." :
                                            mode === "constellation" ? "Describe the idea or market you want mapped..." :
                                            "Describe your SaaS product to find R&D boosts..."
                                        }
                                        className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1 text-sm text-[#17130c] placeholder:text-[#8a7a5d] min-h-[44px] max-h-32"
                                        rows={1}
                                        disabled={analyzing}
                                    />
                                    <button
                                        onClick={() => handleAnalyze()}
                                        disabled={!input.trim() || analyzing}
                                        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                            input.trim() ? "bg-[#e86f2d] text-[#fff9eb] scale-100" : "bg-[#efe3cc] text-[#8a7a5d] scale-90"
                                        }`}
                                    >
                                        {analyzing ? (
                                            <Spinner size={16} color="#17130c" />
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-6">
                            <p className="text-[0.55rem] font-mono text-[#8a7a5d] uppercase tracking-[0.3em]">
                                ENTER TO FORGE
                            </p>
                            <p className="text-[0.55rem] font-mono text-[#8a7a5d] uppercase tracking-[0.3em]">
                                AGNO BACKEND :8321
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
