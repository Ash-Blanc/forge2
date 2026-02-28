"use client";
// app/dashboard/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, RoleBadge, Spinner, Tag, SectionLabel } from "@/components/ui";
import type { ForgeUser } from "@/lib/types";

type AppMode = "paper" | "saas";
type Tab = "analysis" | "competitors" | "suggestions";

interface Session {
    id: string;
    mode: AppMode;
    title: string;
    timestamp: string;
    arxivId?: string;
    meta?: ArxivMeta;
    data?: AnalysisData;
    isSuggestion?: boolean;
    parentId?: string;
}

interface ArxivMeta {
    title: string;
    abstract: string;
    authors: string[];
    published: string;
}

interface PaperAnalysis {
    summary: string;
    coreBreakthrough: string;
    keyInnovations: string[];
    applications: string[];
    limitations: string[];
}

interface Swot {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
}

interface TargetUser {
    persona: string;
    painPoint: string;
    currentAlternatives: string;
}

interface Product {
    coreFeature: string;
    differentiation: string;
}

interface Business {
    pricingModel: string;
    gtm: string;
}

interface Metrics {
    novelty: string;
    competition: string;
    confidence: number;
    mvpMonths: number;
}

interface StartupIdea {
    startupName: string;
    oneLiner: string;
    theHook: string;
    targetUser: TargetUser;
    coreTech: string;
    product: Product;
    business: Business;
    metrics: Metrics;
}

interface Competitor {
    name: string;
    url: string;
    description: string;
    pricing: string;
    differentiation: string;
}

interface CompetitorIntelligence {
    competitors: Competitor[];
    marketVerdict: string;
}

interface Suggestion {
    startupName: string;
    oneLiner: string;
    angle: string;
}

interface AnalysisData {
    paperAnalysis?: PaperAnalysis;
    swot?: Swot;
    startupIdea?: StartupIdea;
    competitorIntelligence?: CompetitorIntelligence;
    suggestions?: Suggestion[];
    overallStrategy?: string;
    papers?: SaasPaper[];
}

interface SaasPaper {
    arxivId: string;
    title: string;
    year: string;
    relevance: string;
    boostIdea: string;
    implementationHint: string;
    difficulty: string;
    impact: string;
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

const loadSessions = (): Session[] => {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem("forge-sessions");
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveSessions = (sessions: Session[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("forge-sessions", JSON.stringify(sessions));
};

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<ForgeUser | null>(null);
    const [mode, setMode] = useState<AppMode>("paper");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [streamOutput, setStreamOutput] = useState("");
    const [error, setError] = useState("");
    const [tab, setTab] = useState<Tab>("analysis");
    const [researchingCompetitors, setResearchingCompetitors] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("forge-user");
        if (!stored) { router.replace("/"); return; }
        setUser(JSON.parse(stored));
        setSessions(loadSessions());
    }, [router]);

    const currentSession = sessions.find(s => s.id === currentSessionId);

    const handleNewSearch = () => {
        setCurrentSessionId(null);
        setInput("");
        setError("");
        setStreamOutput("");
    };

    const runAnalysis = async (sessionId: string, meta: ArxivMeta) => {
        setAnalyzing(true);
        setProgress(10);
        setStatusText("Reading paper...");
        setStreamOutput("");

        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(meta),
            });

            if (!res.ok || !res.body) throw new Error(`Analysis failed: ${res.status}`);

            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === "delta") setStreamOutput(ev.text);
                        if (ev.type === "done") {
                            const data: AnalysisData = typeof ev.analysis === "string" ? JSON.parse(ev.analysis) : ev.analysis;
                            const updated = sessions.map(s => s.id === sessionId ? { ...s, data, meta } : s);
                            setSessions(updated);
                            saveSessions(updated);
                            setProgress(100);
                        }
                        if (ev.type === "error") throw new Error(ev.message);
                    } catch { /* partial */ }
                }
            }

            setProgress(85);
            setStatusText("Generating alternatives...");

            const updated = sessions.map(s => s.id === sessionId ? {
                ...s,
                data: { ...s.data, suggestions: generateMockSuggestions() }
            } : s);
            setSessions(updated);
            saveSessions(updated);

        } catch (e) {
            setError(e instanceof Error ? e.message : "Analysis failed");
        } finally {
            setAnalyzing(false);
            setProgress(0);
            setStatusText("");
        }
    };

    const generateMockSuggestions = (): Suggestion[] => [
        { startupName: "Variant A", oneLiner: "Different angle on the same tech", angle: "vertical" },
        { startupName: "Variant B", oneLiner: "B2B focus instead of consumer", angle: "market" },
        { startupName: "Variant C", oneLiner: "Developer tool focused", angle: "product" },
    ];

    const runSaasBoost = async (sessionId: string) => {
        setAnalyzing(true);
        setProgress(20);
        setStatusText("Scouting relevant research...");

        await new Promise(r => setTimeout(r, 1500));
        setProgress(50);

        const mockPapers: SaasPaper[] = [
            {
                arxivId: "2310.12345",
                title: "Efficient Transformer Inference",
                year: "2023",
                relevance: "Enables faster model serving",
                boostIdea: "Add real-time inference API",
                implementationHint: "Use quantized weights",
                difficulty: "Medium",
                impact: "High"
            },
            {
                arxivId: "2401.56782",
                title: "RAG Systems at Scale",
                year: "2024",
                relevance: "Improve context retrieval",
                boostIdea: "Hybrid search + reranking",
                implementationHint: "Combine BM25 with embeddings",
                difficulty: "Easy",
                impact: "Medium"
            }
        ];

        const data: AnalysisData = {
            overallStrategy: "Leverage recent advances in efficient inference and retrieval to build a differentiated AI product.",
            papers: mockPapers
        };

        const updated = sessions.map(s => s.id === sessionId ? { ...s, data } : s);
        setSessions(updated);
        saveSessions(updated);

        setProgress(100);
        setAnalyzing(false);
        setProgress(0);
        setStatusText("");
    };

    const handleAnalyze = async () => {
        if (!input.trim()) return;
        setError("");

        const sessionId = mode === "paper" 
            ? extractArxivId(input) || `manual_${Date.now()}`
            : `saas_${Date.now()}`;

        let meta: ArxivMeta | undefined;

        if (mode === "paper" && extractArxivId(input)) {
            setLoading(true);
            try {
                const res = await fetch(`/api/arxiv?id=${encodeURIComponent(extractArxivId(input)!)}`);
                if (!res.ok) throw new Error("Failed to fetch paper");
                meta = await res.json();
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to fetch paper");
                setLoading(false);
                return;
            }
            setLoading(false);
        }

        const newSession: Session = {
            id: sessionId,
            mode,
            title: mode === "paper" 
                ? (meta?.title?.slice(0, 40) + "...") || input
                : input.slice(0, 40) + "...",
            timestamp: new Date().toISOString(),
            arxivId: extractArxivId(input) || undefined,
            meta,
        };

        const updated = [newSession, ...sessions];
        setSessions(updated);
        saveSessions(updated);
        setCurrentSessionId(sessionId);

        if (mode === "paper" && meta) {
            await runAnalysis(sessionId, meta);
        } else if (mode === "saas") {
            await runSaasBoost(sessionId);
        }
    };

    const loadSession = (id: string) => {
        const s = sessions.find(sess => sess.id === id);
        if (s) {
            setMode(s.mode);
            setCurrentSessionId(id);
            setTab("analysis");
        }
    };

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const filtered = sessions.filter(s => s.id !== id);
        setSessions(filtered);
        saveSessions(filtered);
        if (currentSessionId === id) setCurrentSessionId(null);
    };

    const clearAllSessions = () => {
        setSessions([]);
        saveSessions([]);
        setCurrentSessionId(null);
    };

    const runCompetitorSearch = async () => {
        if (!currentSession?.data?.startupIdea) return;
        setResearchingCompetitors(true);
        await new Promise(r => setTimeout(r, 2500));
        
        const mockCompetitors: CompetitorIntelligence = {
            marketVerdict: "This space is relatively uncrowded with few direct competitors.",
            competitors: [
                { name: "IdeaForge", url: "https://ideaforge.ai", description: "AI business idea generator", pricing: "$49/mo", differentiation: "We have deeper research backing" },
                { name: "StartupGPT", url: "https://startupgpt.com", description: "YC-style idea scorer", pricing: "Free", differentiation: "More actionable MVP guidance" }
            ]
        };

        const updated = sessions.map(s => s.id === currentSessionId ? {
            ...s,
            data: { ...s.data!, competitorIntelligence: mockCompetitors }
        } : s);
        setSessions(updated);
        saveSessions(updated);
        setResearchingCompetitors(false);
    };

    if (!user) return (
        <div className="h-[100dvh] bg-bg flex items-center justify-center">
            <Spinner size={24} />
        </div>
    );

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-bg">
            {/* Ambient */}
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: 'radial-gradient(circle at 30% 20%, var(--accent-dim), transparent 50%)' }} />

            {/* Nav */}
            <nav className="h-[50px] border-b border-border px-4 flex items-center justify-between bg-surface/80 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-[18px]">
                    <Link href="/" className="flex items-center gap-2 cursor-pointer no-underline group">
                        <span className="font-extrabold text-xl tracking-tight text-text">FORGE</span>
                        <span className="text-accent text-[1.2rem] font-mono leading-none">⬡</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-[7px]">
                        <Avatar name={user.name} role={user.role} size={24} />
                        <div>
                            <div className="text-text text-[0.72rem] font-mono font-semibold leading-[1.2]">{user.name}</div>
                            <RoleBadge role={user.role} />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-[280px] border-r border-border bg-surface/40 backdrop-blur-sm flex flex-col shrink-0">
                    {/* Mode Toggle */}
                    <div className="p-3 border-b border-border">
                        <div className="flex gap-[1px] bg-bg rounded-md p-[2px]">
                            <button
                                onClick={() => { setMode("paper"); setCurrentSessionId(null); }}
                                className={`flex-1 px-2 py-1.5 text-[0.65rem] font-mono uppercase tracking-wide rounded-sm transition-all ${mode === "paper" ? "bg-elevated text-text shadow-sm" : "text-muted hover:text-text"}`}
                            >
                                📄 Paper → Idea
                            </button>
                            <button
                                onClick={() => { setMode("saas"); setCurrentSessionId(null); }}
                                className={`flex-1 px-2 py-1.5 text-[0.65rem] font-mono uppercase tracking-wide rounded-sm transition-all ${mode === "saas" ? "bg-elevated text-text shadow-sm" : "text-muted hover:text-text"}`}
                            >
                                💼 SaaS → Papers
                            </button>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-3 border-b border-border">
                        {mode === "paper" ? (
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                                placeholder="arXiv ID (e.g. 2409.13449)"
                                className="field text-[0.75rem]"
                                disabled={analyzing}
                            />
                        ) : (
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Describe your SaaS product... (e.g. A B2B platform that automates API testing using AI)"
                                className="field text-[0.75rem]"
                                rows={3}
                                disabled={analyzing}
                            />
                        )}
                        <button
                            onClick={handleAnalyze}
                            disabled={!input.trim() || analyzing || loading}
                            className="btn-primary w-full mt-2 text-[0.7rem]"
                        >
                            {loading ? "Fetching..." : analyzing ? "Analyzing..." : mode === "paper" ? "Distill Blueprint" : "Find Research Boosts"}
                        </button>
                        {error && <p className="text-red-custom text-[0.65rem] mt-2 font-mono">{error}</p>}
                    </div>

                    {/* Progress */}
                    {analyzing && (
                        <div className="px-3 pb-3">
                            <div className="h-1 bg-bg rounded-full overflow-hidden mb-1">
                                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-[0.6rem] text-muted font-mono">{statusText}</p>
                            {streamOutput && (
                                <div className="mt-2 p-2 bg-bg rounded text-[0.55rem] text-faint font-mono max-h-20 overflow-y-auto">
                                    {streamOutput.slice(-300)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History */}
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="flex justify-between items-center px-2 mb-2">
                            <span className="text-[0.6rem] font-mono text-muted uppercase tracking-wide">History</span>
                            {sessions.length > 0 && (
                                <button onClick={clearAllSessions} className="text-[0.6rem] text-muted hover:text-red-custom font-mono">
                                    Clear
                                </button>
                            )}
                        </div>
                        {sessions.length === 0 ? (
                            <p className="text-[0.65rem] text-muted text-center py-4">No analyses yet</p>
                        ) : (
                            sessions.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => loadSession(s.id)}
                                    className={`p-2 rounded-md cursor-pointer mb-1 transition-all ${currentSessionId === s.id ? "bg-elevated border border-border-h" : "hover:bg-surface border border-transparent"}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span className="text-[0.55rem]">{s.mode === "paper" ? "📄" : "💼"}</span>
                                                <span className="text-[0.7rem] text-text font-mono truncate">{s.title}</span>
                                            </div>
                                            <span className="text-[0.55rem] text-faint font-mono">
                                                {new Date(s.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={e => deleteSession(s.id, e)}
                                            className="text-[0.6rem] text-muted hover:text-red-custom px-1"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 relative">
                    {currentSession ? (
                        <div className="max-w-4xl mx-auto animate-fade-up">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <button onClick={handleNewSearch} className="text-accent text-[0.7rem] font-mono hover:underline mb-2">
                                        ← New Search
                                    </button>
                                    <h1 className="text-text text-[1.1rem] font-bold leading-tight">
                                        {currentSession.mode === "saas" ? "Research Boosts" : currentSession.data?.startupIdea?.startupName || currentSession.title}
                                    </h1>
                                    {currentSession.data?.startupIdea && (
                                        <p className="text-muted text-[0.8rem] mt-1">{currentSession.data.startupIdea.oneLiner}</p>
                                    )}
                                </div>
                                {currentSession.arxivId && (
                                    <Tag text={currentSession.arxivId} color="var(--color-muted)" />
                                )}
                            </div>

                            {currentSession.mode === "saas" ? (
                                /* SaaS Mode Results */
                                <div className="space-y-4">
                                    {currentSession.data?.overallStrategy && (
                                        <div className="card p-4 border-l-4 border-accent">
                                            <SectionLabel>Overall R&D Strategy</SectionLabel>
                                            <p className="text-text text-[0.85rem] leading-relaxed mt-1">
                                                {currentSession.data.overallStrategy}
                                            </p>
                                        </div>
                                    )}

                                    {currentSession.data?.papers?.map((paper, i) => (
                                        <div key={i} className="card p-4 hover:border-border-h transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-text text-[0.9rem] font-semibold">{paper.title}</h3>
                                                <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" className="text-accent text-[0.65rem] font-mono hover:underline">
                                                    arXiv:{paper.arxivId} · {paper.year}
                                                </a>
                                            </div>
                                            <p className="text-muted text-[0.8rem] mb-2"><span className="text-accent">Relevance:</span> {paper.relevance}</p>
                                            <div className="bg-bg p-2 rounded-md mb-2">
                                                <p className="text-[0.75rem] text-text"><span className="text-accent">💡 Boost:</span> {paper.boostIdea}</p>
                                            </div>
                                            <p className="text-faint text-[0.7rem] italic mb-2">{paper.implementationHint}</p>
                                            <div className="flex gap-2">
                                                <span className="text-[0.6rem] font-mono px-2 py-0.5 bg-surface rounded border border-border">Difficulty: {paper.difficulty}</span>
                                                <span className="text-[0.6rem] font-mono px-2 py-0.5 bg-surface rounded border border-border">Impact: {paper.impact}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Paper Mode Results */
                                <>
                                    {/* Metrics */}
                                    {currentSession.data?.startupIdea?.metrics && (
                                        <div className="grid grid-cols-4 gap-3 mb-6">
                                            {[
                                                { label: "Novelty", val: currentSession.data.startupIdea.metrics.novelty },
                                                { label: "Competition", val: currentSession.data.startupIdea.metrics.competition },
                                                { label: "Confidence", val: `${currentSession.data.startupIdea.metrics.confidence}/10` },
                                                { label: "MVP", val: `${currentSession.data.startupIdea.metrics.mvpMonths} months` },
                                            ].map(m => (
                                                <div key={m.label} className="card p-3 text-center">
                                                    <div className="text-[0.6rem] font-mono text-muted uppercase mb-1">{m.label}</div>
                                                    <div className="text-accent text-[0.9rem] font-bold">{m.val}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tabs */}
                                    <div className="flex gap-1 mb-4 border-b border-border pb-1">
                                        {(["analysis", "competitors", "suggestions"] as Tab[]).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setTab(t)}
                                                className={`px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-wide rounded-t-sm transition-all ${tab === t ? "bg-surface text-text border-b-2 border-accent" : "text-muted hover:text-text"}`}
                                            >
                                                {t === "analysis" ? "🎯 Analysis" : t === "competitors" ? "🕵️ Competitors" : "💡 Alternatives"}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Analysis Tab */}
                                    {tab === "analysis" && (
                                        <div className="space-y-4">
                                            {currentSession.data?.paperAnalysis && (
                                                <>
                                                    <div className="card p-4">
                                                        <SectionLabel>Summary</SectionLabel>
                                                        <p className="text-[#8fa3be] text-[0.85rem] leading-relaxed mt-1">
                                                            {currentSession.data.paperAnalysis.summary}
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="card p-3">
                                                            <SectionLabel>Core Breakthrough</SectionLabel>
                                                            <p className="text-text text-[0.8rem] mt-1">{currentSession.data.paperAnalysis.coreBreakthrough}</p>
                                                        </div>
                                                        <div className="card p-3">
                                                            <SectionLabel>Limitations</SectionLabel>
                                                            <ul className="text-muted text-[0.75rem] mt-1 space-y-1">
                                                                {currentSession.data.paperAnalysis.limitations.map((l, i) => (
                                                                    <li key={i}>• {l}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    <div className="card p-3">
                                                        <SectionLabel>Key Innovations</SectionLabel>
                                                        <ul className="text-text text-[0.8rem] mt-1 space-y-1">
                                                            {currentSession.data.paperAnalysis.keyInnovations.map((inn, i) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-accent">→</span> {inn}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="card p-3">
                                                        <SectionLabel>Applications</SectionLabel>
                                                        <ul className="text-muted text-[0.8rem] mt-1 space-y-1">
                                                            {currentSession.data.paperAnalysis.applications.map((app, i) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-teal-custom">•</span> {app}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </>
                                            )}

                                            {/* SWOT */}
                                            {currentSession.data?.swot && (
                                                <div className="card p-4">
                                                    <SectionLabel>SWOT Analysis</SectionLabel>
                                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                                        <div>
                                                            <p className="text-[0.7rem] font-mono text-sage-custom uppercase mb-2">Strengths</p>
                                                            <ul className="text-[0.75rem] text-text space-y-1">
                                                                {currentSession.data.swot.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <p className="text-[0.7rem] font-mono text-red-custom uppercase mb-2">Weaknesses</p>
                                                            <ul className="text-[0.75rem] text-muted space-y-1">
                                                                {currentSession.data.swot.weaknesses.map((w, i) => <li key={i}>✗ {w}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <p className="text-[0.7rem] font-mono text-blue uppercase mb-2">Opportunities</p>
                                                            <ul className="text-[0.75rem] text-text space-y-1">
                                                                {currentSession.data.swot.opportunities.map((o, i) => <li key={i}>＋ {o}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <p className="text-[0.7rem] font-mono text-muted uppercase mb-2">Threats</p>
                                                            <ul className="text-[0.75rem] text-muted space-y-1">
                                                                {currentSession.data.swot.threats.map((t, i) => <li key={i}>⚠ {t}</li>)}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Startup Idea Details */}
                                            {currentSession.data?.startupIdea && (
                                                <>
                                                    {currentSession.data.startupIdea.targetUser && (
                                                        <div className="card p-4 border-l-4 border-teal-custom">
                                                            <SectionLabel>Target User</SectionLabel>
                                                            <p className="text-text text-[0.85rem] font-semibold mt-1">{currentSession.data.startupIdea.targetUser.persona}</p>
                                                            <p className="text-red-custom text-[0.8rem] mt-1">Pain: {currentSession.data.startupIdea.targetUser.painPoint}</p>
                                                            <p className="text-muted text-[0.75rem] mt-1">Alternatives: {currentSession.data.startupIdea.targetUser.currentAlternatives}</p>
                                                        </div>
                                                    )}

                                                    {currentSession.data.startupIdea.product && (
                                                        <div className="card p-3">
                                                            <SectionLabel>Product</SectionLabel>
                                                            <p className="text-text text-[0.8rem] mt-1">{currentSession.data.startupIdea.product.coreFeature}</p>
                                                            <p className="text-muted text-[0.75rem] mt-1"><span className="text-accent">Differentiation:</span> {currentSession.data.startupIdea.product.differentiation}</p>
                                                        </div>
                                                    )}

                                                    {currentSession.data.startupIdea.business && (
                                                        <div className="card p-3">
                                                            <SectionLabel>Business</SectionLabel>
                                                            <p className="text-text text-[0.8rem] mt-1"><span className="text-muted">Pricing:</span> {currentSession.data.startupIdea.business.pricingModel}</p>
                                                            <p className="text-text text-[0.8rem] mt-1"><span className="text-muted">GTM:</span> {currentSession.data.startupIdea.business.gtm}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Competitors Tab */}
                                    {tab === "competitors" && (
                                        <div>
                                            {currentSession.data?.competitorIntelligence ? (
                                                <div className="space-y-3">
                                                    <div className="card p-3 bg-blue-dim border-blue/30">
                                                        <SectionLabel>Market Verdict</SectionLabel>
                                                        <p className="text-text text-[0.85rem] mt-1">{currentSession.data.competitorIntelligence.marketVerdict}</p>
                                                    </div>

                                                    {currentSession.data.competitorIntelligence.competitors.length === 0 ? (
                                                        <div className="card p-4 text-center">
                                                            <p className="text-sage-custom text-[0.85rem]">🎉 No direct competitors found! Blue ocean territory.</p>
                                                        </div>
                                                    ) : (
                                                        currentSession.data.competitorIntelligence.competitors.map((comp, i) => (
                                                            <div key={i} className="card p-3">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h4 className="text-text text-[0.9rem] font-semibold">{comp.name}</h4>
                                                                    <a href={comp.url} target="_blank" className="text-accent text-[0.65rem] hover:underline">Visit</a>
                                                                </div>
                                                                <p className="text-muted text-[0.75rem]">{comp.description}</p>
                                                                <p className="text-faint text-[0.7rem] mt-1">Pricing: {comp.pricing}</p>
                                                                <div className="mt-2 pl-2 border-l-2 border-accent/40">
                                                                    <p className="text-[0.7rem] text-text"><span className="text-accent">Why we win:</span> {comp.differentiation}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="card p-6 text-center">
                                                    <p className="text-muted text-[0.8rem] mb-4">Run a live search to find current competitors for this idea.</p>
                                                    <button
                                                        onClick={runCompetitorSearch}
                                                        disabled={researchingCompetitors}
                                                        className="btn-primary"
                                                    >
                                                        {researchingCompetitors ? "Searching..." : "🔍 Run Deep Competitor Research"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Suggestions Tab */}
                                    {tab === "suggestions" && (
                                        <div>
                                            {currentSession.data?.suggestions && currentSession.data.suggestions.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {currentSession.data.suggestions.map((sug, i) => (
                                                        <div key={i} className="card p-3 hover:border-border-h transition-colors cursor-pointer">
                                                            <h4 className="text-accent text-[0.85rem] font-semibold">{sug.startupName}</h4>
                                                            <p className="text-muted text-[0.75rem] mt-1">{sug.oneLiner}</p>
                                                            <span className="inline-block mt-2 text-[0.6rem] font-mono px-2 py-0.5 bg-surface rounded border border-border">{sug.angle}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="card p-6 text-center">
                                                    <p className="text-muted text-[0.8rem]">No alternative suggestions available yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="text-accent text-[3rem] mb-4 font-extrabold tracking-tight">
                                {mode === "paper" ? "Distill Intelligence." : "Boost Your SaaS."}
                            </div>
                            <p className="text-muted text-[0.9rem] max-w-md mb-6">
                                {mode === "paper" 
                                    ? "Enter an arXiv paper to find the best startup idea. We'll analyze the research and generate actionable insights."
                                    : "Describe your SaaS product to find the most relevant academic research to give it a technical edge."
                                }
                            </p>
                            <div className="flex gap-4 text-[0.7rem] font-mono text-muted">
                                {mode === "paper" ? (
                                    <>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">01</div>
                                            Ingest Paper
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">02</div>
                                            Analyze
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">03</div>
                                            Explore Ideas
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">01</div>
                                            Describe
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">02</div>
                                            Scout
                                        </div>
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center mx-auto mb-2 text-accent">03</div>
                                            Boost
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
