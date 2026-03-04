"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { UserButton, useUser } from "@clerk/nextjs";
import { Avatar, Spinner, Tag, SectionLabel } from "@/components/ui";
import { AnalysisReport } from "@/components/AnalysisReport";
import { parseStreamedJson } from "@/lib/parseStreamedJson";



type AppMode = "paper" | "saas" | "constellation";

const AVAILABLE_MODELS = [
    { id: "amazon:amazon.nova-pro-v1:0", name: "Nova Pro", provider: "amazon" },
    {
        id: "amazon:amazon.nova-lite-v1:0",
        name: "Nova 2 Lite",
        provider: "amazon",
    },
];

interface Session {
    id: string;
    mode: AppMode;
    title: string;
    timestamp: string;
    inputText?: string;
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

interface SessionApiRecord {
    id: string;
    mode: AppMode;
    title: string;
    input_text: string | null;
    arxiv_id: string | null;
    meta: ArxivMeta | null;
    output: unknown;
    output_text: string | null;
    error: string | null;
    created_at: string;
    updated_at: string;
}

const extractArxivId = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(trimmed)) return trimmed;
    const match = trimmed.match(
        /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/,
    );
    if (match) return match[1];
    const simpleMatch = trimmed.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/);
    if (simpleMatch) return simpleMatch[1];
    return null;
};

const stripArxivReference = (input: string, arxivId: string): string => {
    return input
        .replace(new RegExp(`https?://arxiv\\.org/(?:abs|pdf)/${arxivId}(?:\\.pdf)?`, "gi"), "")
        .replace(new RegExp(`\\barxiv:${arxivId}\\b`, "gi"), "")
        .replace(new RegExp(`\\b${arxivId}\\b`, "gi"), "")
        .trim();
};

const parseMaybeJsonString = (value: string): unknown => {
    const trimmed = value.trim();
    if (!trimmed) return value;

    const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

    if (!(candidate.startsWith("{") || candidate.startsWith("["))) {
        return value;
    }

    try {
        return JSON.parse(candidate);
    } catch {
        return value;
    }
};

const safeJsonParse = (raw: string): unknown => {
    const parsed = parseMaybeJsonString(raw);
    return parsed !== raw ? parsed : raw;
};

const trimTitle = (value: string): string => {
    if (value.length <= 68) return value;
    return `${value.slice(0, 68)}...`;
};

const generateSmartTitle = (mode: AppMode, input: string): string => {
    const cleaned = input.trim();

    if (mode === "paper") {
        // For papers, use the input as-is (will be replaced with actual title from arXiv)
        return `Research: ${cleaned}`;
    }

    if (mode === "saas") {
        // Extract key product concept
        const words = cleaned.split(/\s+/);
        if (words.length <= 6) {
            return cleaned;
        }
        // Take first meaningful phrase
        const keyPhrase = words.slice(0, 6).join(" ");
        return `${keyPhrase}...`;
    }

    if (mode === "constellation") {
        // Extract market/domain focus
        const words = cleaned.split(/\s+/);
        if (words.length <= 5) {
            return cleaned;
        }
        // Focus on the core concept
        const keyPhrase = words.slice(0, 5).join(" ");
        return `${keyPhrase}...`;
    }

    return cleaned;
};

const getPaperSessionTitle = (meta: ArxivMeta, arxivId: string): string => {
    const raw = (meta.title || "").replace(/\s+/g, " ").trim();
    if (!raw) return `Research: ${arxivId}`;
    if (/^arxiv\s+query:/i.test(raw) || /^search\s+results?/i.test(raw)) {
        return `Research: ${arxivId}`;
    }
    return raw;
};

const toLabel = (key: string): string =>
    key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const toReadableText = (value: unknown, depth = 0): string => {
    if (value == null) return "Not provided";
    if (typeof value === "string") return value.trim() || "Not provided";
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);

    if (Array.isArray(value)) {
        if (!value.length) return "Not provided";
        return value
            .slice(0, 6)
            .map((item) => toReadableText(item, depth + 1))
            .filter((item) => item && item !== "Not provided")
            .join(" • ");
    }

    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const preferredKeys = [
            "summary",
            "oneLiner",
            "coreBreakthrough",
            "recommendation",
            "thesis",
            "output",
        ];
        for (const key of preferredKeys) {
            if (typeof obj[key] === "string" && obj[key])
                return String(obj[key]);
        }

        if (depth > 1) return "Structured output available";

        const pairs = Object.entries(obj).slice(0, 6);
        if (!pairs.length) return "Not provided";
        return pairs
            .map(([k, v]) => `${toLabel(k)}: ${toReadableText(v, depth + 1)}`)
            .join(" • ");
    }

    return "Not provided";
};

const getReadableSections = (
    output: unknown,
): Array<{ title: string; body: string }> => {
    if (output == null) return [];
    if (typeof output === "string") {
        const parsed = parseMaybeJsonString(output);
        if (parsed !== output) return getReadableSections(parsed);
        return [
            { title: "Result", body: output.trim() || "No details returned." },
        ];
    }
    if (Array.isArray(output))
        return [{ title: "Result", body: toReadableText(output) }];
    if (typeof output !== "object")
        return [{ title: "Result", body: String(output) }];

    const entries = Object.entries(output as Record<string, unknown>);
    if (!entries.length)
        return [{ title: "Result", body: "No details returned." }];

    return entries
        .map(([key, value]) => ({
            title: toLabel(key),
            body: toReadableText(value),
        }))
        .filter((section) => section.body && section.body !== "Not provided");
};

export default function DashboardPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [mode, setMode] = useState<AppMode>("paper");
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(
        null,
    );
    const [input, setInput] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [streamOutput, setStreamOutput] = useState("");
    const [error, setError] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copied, setCopied] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleShare = async () => {
        if (!currentSession || !currentSession.data?.output) return;
        const data = currentSession.data.output as any;
        const analysis = data.analysis || data;

        const lines = [
            `✦ Forge Blueprint: ${currentSession.title} ✦\n`,
            analysis.opportunity ? ` CORE OPPORTUNITY:\n${analysis.opportunity}\n` : '',
            analysis.coreInnovation ? ` TECHNICAL BREAKTHROUGH:\n${analysis.coreInnovation}\n` : '',
            analysis.targetCustomer ? ` IDEAL CUSTOMER:\n${analysis.targetCustomer}\n` : '',
            analysis.marketSize ? ` MARKET SIZE:\n${analysis.marketSize}\n` : '',
            analysis.moatAnalysis ? ` DEFENSIBILITY:\n${analysis.moatAnalysis}\n` : '',
            (analysis.buildComplexity || analysis.mvpDays) ? ` EXECUTION:\nComplexity: ${analysis.buildComplexity} | MVP Time: ~${analysis.mvpDays} days\n` : '',
            `\nShared from FORGE AI`
        ];

        try {
            await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const handleExport = (format: "json" | "md") => {
        if (!currentSession) return;
        const { id, title, timestamp, mode, arxivId, data, error } = currentSession;

        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const date = new Date(timestamp).toISOString().split('T')[0];
        const filename = `forge_${mode}_${safeTitle}_${date}.${format}`;

        let content = "";

        if (format === "json") {
            const payload = {
                id, title, timestamp, mode, arxivId,
                data: data?.output || null,
                error: error || null
            };
            content = JSON.stringify(payload, null, 2);
        } else {
            content = `# Forge Session: ${title}\n\n`;
            content += `- **Date:** ${new Date(timestamp).toLocaleString()}\n`;
            content += `- **Mode:** ${mode}\n`;
            if (arxivId) content += `- **arXiv ID:** ${arxivId}\n`;
            content += `\n---\n\n`;

            if (error) {
                content += `## Error\n\n${error}\n\n`;
            } else if (data?.output) {
                const outputData = data.output as any;
                // Special case for our standardized format
                if (mode === "paper" && outputData.opportunity) {
                    content += `## Core Opportunity\n${outputData.opportunity}\n\n`;
                    content += `## Technical Breakthrough\n${outputData.coreInnovation}\n\n`;
                    content += `## Target Customer\n${outputData.targetCustomer}\n\n`;
                    content += `## Market Size\n${outputData.marketSize}\n\n`;
                    content += `## Defensibility\n${outputData.moatAnalysis}\n\n`;
                    content += `## Narrative\n${outputData.narrativeAnalysis}\n\n`;
                } else {
                    const sections = getReadableSections(data.output);
                    sections.forEach(sec => {
                        content += `## ${sec.title}\n\n${sec.body}\n\n`;
                    });
                }
            } else {
                content += `*No data available.*\n`;
            }
        }

        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const scrollRef = useRef<HTMLDivElement>(null);

    const mapApiSession = (raw: SessionApiRecord): Session => {
        let output: unknown = raw.output;
        if (output == null && raw.output_text) {
            output = safeJsonParse(raw.output_text);
        }

        return {
            id: raw.id,
            mode: raw.mode,
            title: raw.title,
            timestamp: raw.updated_at || raw.created_at,
            inputText: raw.input_text || undefined,
            arxivId: raw.arxiv_id || undefined,
            meta: raw.meta || undefined,
            data:
                output == null
                    ? undefined
                    : { output, outputText: raw.output_text || undefined },
            error: raw.error || undefined,
        };
    };

    const parseApiError = async (
        res: Response,
        fallback: string,
    ): Promise<string> => {
        try {
            const payload = await res.json();
            if (typeof payload?.error === "string" && payload.error)
                return payload.error;
            if (typeof payload?.message === "string" && payload.message)
                return payload.message;
        } catch {
            // no-op
        }
        return fallback;
    };

    const migrateLocalSessions = async () => {
        const legacyRaw = localStorage.getItem("forge-sessions");
        if (!legacyRaw) return;

        try {
            const parsed = JSON.parse(legacyRaw);
            if (!Array.isArray(parsed) || !parsed.length) {
                localStorage.removeItem("forge-sessions");
                return;
            }

            const res = await fetch("/api/sessions/migrate-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessions: parsed }),
            });
            if (res.ok) {
                localStorage.removeItem("forge-sessions");
            }
        } catch {
            localStorage.removeItem("forge-sessions");
        }
    };

    const fetchSessions = async () => {
        const res = await fetch("/api/sessions", { cache: "no-store" });
        if (!res.ok) {
            throw new Error(
                await parseApiError(res, "Failed to load sessions."),
            );
        }

        const payload = (await res.json()) as SessionApiRecord[];
        const mapped = Array.isArray(payload) ? payload.map(mapApiSession) : [];
        setSessions(mapped);
        setCurrentSessionId((prev) => {
            if (prev && mapped.some((s) => s.id === prev)) return prev;
            return mapped[0]?.id ?? null;
        });
    };

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        let cancelled = false;
        (async () => {
            try {
                await migrateLocalSessions();
                if (!cancelled) await fetchSessions();
            } catch (e: unknown) {
                if (!cancelled) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Failed to load sessions.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setSessionsLoaded(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isLoaded, isSignedIn]);

    const upsertSession = (session: Session) => {
        setSessions((prev) => {
            const next = [
                session,
                ...prev.filter((s) => s.id !== session.id),
            ].sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
            );
            return next;
        });
    };

    const patchSession = (sessionId: string, patch: Partial<Session>) => {
        setSessions((prev) => {
            const existing = prev.find((s) => s.id === sessionId);
            if (!existing) return prev;
            const updated = {
                ...existing,
                ...patch,
                timestamp: new Date().toISOString(),
            };
            return [updated, ...prev.filter((s) => s.id !== sessionId)];
        });
    };

    const createSession = async (payload: {
        mode: AppMode;
        title: string;
        inputText?: string;
        arxivId?: string;
        meta?: ArxivMeta;
    }): Promise<Session> => {
        const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            throw new Error(
                await parseApiError(res, "Failed to create session."),
            );
        }

        const created = (await res.json()) as SessionApiRecord;
        const mapped = mapApiSession(created);
        upsertSession(mapped);
        return mapped;
    };

    const patchSessionRemote = async (
        sessionId: string,
        patch: Partial<Session>,
    ) => {
        const body: Record<string, unknown> = {};
        if (patch.title !== undefined) body.title = patch.title;
        if (patch.inputText !== undefined) body.inputText = patch.inputText;
        if (patch.arxivId !== undefined) body.arxivId = patch.arxivId;
        if (patch.meta !== undefined) body.meta = patch.meta;
        if (patch.data?.output !== undefined) body.output = patch.data.output;
        if (patch.data?.outputText !== undefined)
            body.outputText = patch.data.outputText;
        if (patch.error !== undefined) body.error = patch.error;

        const res = await fetch(
            `/api/sessions/${encodeURIComponent(sessionId)}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
        );
        if (!res.ok) {
            throw new Error(
                await parseApiError(res, "Failed to update session."),
            );
        }

        const updated = (await res.json()) as SessionApiRecord;
        upsertSession(mapApiSession(updated));
    };

    const deleteSession = async (sessionId: string) => {
        const current = sessions;
        const updated = current.filter((s) => s.id !== sessionId);
        setSessions(updated);
        if (currentSessionId === sessionId) {
            setCurrentSessionId(updated[0]?.id ?? null);
        }

        const res = await fetch(
            `/api/sessions/${encodeURIComponent(sessionId)}`,
            {
                method: "DELETE",
            },
        );
        if (!res.ok) {
            setSessions(current);
            throw new Error(
                await parseApiError(res, "Failed to delete session."),
            );
        }
    };

    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const canSubmitWithSessionPaper =
        mode === "paper" &&
        currentSession?.mode === "paper" &&
        Boolean(currentSession.arxivId);
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

                if (
                    payload.type === "delta" &&
                    typeof payload.text === "string"
                ) {
                    setStreamOutput(payload.text);
                }

                if (payload.type === "error") {
                    throw new Error(
                        payload.message || "Backend returned an error.",
                    );
                }

                if (payload.type === "done") {
                    finalOutput = payload.analysis ?? payload.text ?? payload;
                }
            }
        }

        return finalOutput;
    };

    const handleAnalyze = async (
        manualId?: string,
        manualMode?: AppMode,
        manualInput?: string,
    ) => {
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

        let activeSessionId: string | null = null;

        try {
            if (targetMode === "paper") {
                const activePaperSession =
                    currentSession?.mode === "paper" ? currentSession : null;
                const explicitArxivId = manualId || extractArxivId(targetInput);
                const arxivId = explicitArxivId || activePaperSession?.arxivId;
                if (!arxivId) {
                    throw new Error(
                        "Paper mode requires a valid arXiv ID or URL for the first run.",
                    );
                }

                const shouldReuseSession = Boolean(
                    activePaperSession &&
                    (!explicitArxivId ||
                        explicitArxivId === activePaperSession.arxivId),
                );
                let meta: ArxivMeta | undefined = shouldReuseSession
                    ? activePaperSession?.meta
                    : undefined;

                if (!meta) {
                    setStatusText("Fetching arXiv metadata");
                    const metaRes = await fetch(
                        `/api/arxiv?id=${encodeURIComponent(arxivId)}`,
                    );
                    if (!metaRes.ok) {
                        const metaErr = await metaRes.json().catch(() => ({}));
                        throw new Error(
                            metaErr?.error || "Failed to fetch arXiv metadata.",
                        );
                    }
                    meta = (await metaRes.json()) as ArxivMeta;
                }

                const session = shouldReuseSession && activePaperSession
                    ? activePaperSession
                    : await createSession({
                        mode: targetMode,
                        title: trimTitle(getPaperSessionTitle(meta, arxivId)),
                        inputText: targetInput,
                        arxivId,
                        meta,
                    });
                activeSessionId = session.id;
                setCurrentSessionId(session.id);
                setInput("");

                if (shouldReuseSession) {
                    const nextInputText =
                        targetInput || activePaperSession?.inputText;
                    patchSession(session.id, {
                        inputText: nextInputText,
                        arxivId,
                        meta,
                        error: undefined,
                    });
                    await patchSessionRemote(session.id, {
                        inputText: nextInputText,
                        arxivId,
                        meta,
                        error: undefined,
                    });
                }

                const userQuery = stripArxivReference(targetInput, arxivId);

                setStatusText("Running Forge Analyst");
                const analyzeRes = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...meta,
                        arxivId,
                        userQuery: userQuery || undefined,
                        model: selectedModel,
                    }),
                });

                const final = await readStreamingResponse(analyzeRes);
                patchSession(session.id, {
                    data: {
                        output:
                            typeof final === "string"
                                ? safeJsonParse(final)
                                : final,
                        outputText:
                            typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
                await patchSessionRemote(session.id, {
                    data: {
                        output:
                            typeof final === "string"
                                ? safeJsonParse(final)
                                : final,
                        outputText:
                            typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
            }

            if (targetMode === "saas") {
                const session = await createSession({
                    mode: targetMode,
                    title: trimTitle(
                        generateSmartTitle(targetMode, targetInput),
                    ),
                    inputText: targetInput,
                });
                activeSessionId = session.id;
                setCurrentSessionId(session.id);
                setInput("");

                setStatusText("Researching related papers");
                const saasRes = await fetch("/api/analyze-saas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        description: targetInput,
                        model: selectedModel,
                    }),
                });

                const final = await readStreamingResponse(saasRes);
                patchSession(session.id, {
                    data: {
                        output:
                            typeof final === "string"
                                ? safeJsonParse(final)
                                : final,
                        outputText:
                            typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
                await patchSessionRemote(session.id, {
                    data: {
                        output:
                            typeof final === "string"
                                ? safeJsonParse(final)
                                : final,
                        outputText:
                            typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
            }

            if (targetMode === "constellation") {
                const session = await createSession({
                    mode: targetMode,
                    title: trimTitle(
                        generateSmartTitle(targetMode, targetInput),
                    ),
                    inputText: targetInput,
                });
                activeSessionId = session.id;
                setCurrentSessionId(session.id);
                setInput("");

                setStatusText("Running market and competitor scan");
                const competitorRes = await fetch("/api/analyze-competitors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ideaContext: targetInput,
                        model: selectedModel,
                    }),
                });

                const final = await readStreamingResponse(competitorRes);
                patchSession(session.id, {
                    data: {
                        output:
                            typeof final === "string"
                                ? safeJsonParse(final)
                                : final,
                        outputText:
                            typeof final === "string" ? final : undefined,
                    },
                    error: undefined,
                });
                await patchSessionRemote(session.id, {
                    data: {
                        output:
                            typeof final === "string"
                                ? safeJsonParse(final)
                                : final,
                        outputText:
                            typeof final === "string" ? final : undefined,
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
                await patchSessionRemote(activeSessionId, {
                    error: message,
                }).catch(() => {
                    // no-op
                });
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
            {/* Sidebar with improved responsive behavior */}
            <aside
                className={`
                border-r border-[#e8dfcf] bg-[#f4ebd9]/90 backdrop-blur flex flex-col
                transition-all duration-300 ease-in-out
                ${sidebarOpen ? "w-72 pointer-events-auto" : "w-0 pointer-events-none"}
                fixed lg:relative inset-y-0 left-0 z-30
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                overflow-hidden
            `}
            >
                <div className="p-4 border-b border-[#e8dfcf] flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="font-extrabold text-lg tracking-tighter">
                            FORGE
                        </span>
                        <span className="text-[#e86f2d] text-xl">⬡</span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="text-[#6b5b3f] hover:text-[#17130c] p-1 transition-colors"
                        aria-label="Collapse sidebar"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                            />
                        </svg>
                    </button>
                </div>

                <div className="p-3">
                    <button
                        onClick={() => {
                            setCurrentSessionId(null);
                            setInput("");
                            setStreamOutput("");
                            setError("");
                            setSidebarOpen(false); // Auto-close on mobile
                        }}
                        className="lp-btn-secondary w-full flex items-center justify-start gap-3 border-dashed px-3 py-2 text-sm hover:bg-[#fff5e1] transition-colors"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        New Forge Session
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 space-y-1">
                    <div className="px-3 py-2">
                        <SectionLabel>Recent Operations</SectionLabel>
                    </div>
                    {sessions.length === 0 ? (
                        <div className="px-3 py-8 text-center space-y-2">
                            <div className="text-[#9c8e74] text-2xl"></div>
                            <p className="text-[#8a7a5d] text-[0.7rem] font-mono uppercase tracking-widest">
                                {sessionsLoaded
                                    ? "No history recorded"
                                    : "Loading sessions"}
                            </p>
                        </div>
                    ) : (
                        sessions.map((s) => (
                            <div
                                key={s.id}
                                className={`w-full p-1 rounded-lg transition-all border ${currentSessionId === s.id
                                    ? "bg-[#fff5e2] border-[#eec681]"
                                    : "hover:bg-[#f8efde] border-transparent"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setCurrentSessionId(s.id);
                                            setMode(s.mode);
                                            setError(s.error || "");
                                            setStreamOutput("");
                                            setSidebarOpen(false);
                                        }}
                                        className="flex-1 text-left p-2 rounded-md flex items-center gap-3 min-w-0"
                                    >
                                        <span className="text-[0.8rem] opacity-50 shrink-0">
                                            {s.mode === "paper"
                                                ? ""
                                                : s.mode === "constellation"
                                                    ? ""
                                                    : ""}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className={`text-[0.75rem] font-medium truncate ${currentSessionId === s.id
                                                    ? "text-[#b2541f]"
                                                    : "text-[#17130c]"
                                                    }`}
                                            >
                                                {s.title}
                                            </div>
                                            <div className="text-[0.6rem] text-[#8a7a5d] font-mono uppercase">
                                                {new Date(
                                                    s.timestamp,
                                                ).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void deleteSession(s.id).catch(
                                                (err: unknown) => {
                                                    setError(
                                                        err instanceof Error
                                                            ? err.message
                                                            : "Failed to delete session.",
                                                    );
                                                },
                                            );
                                        }}
                                        className="shrink-0 h-8 w-8 rounded-md text-[#8a7a5d] hover:text-[#17130c] hover:bg-[#efe4d0] transition-colors"
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
                        <Avatar
                            name={
                                user?.fullName ||
                                user?.primaryEmailAddress?.emailAddress ||
                                "User"
                            }
                            role="researcher"
                            size={28}
                        />
                        <div className="min-w-0">
                            <div className="text-[0.75rem] font-bold truncate">
                                {user?.fullName || "FORGE Operator"}
                            </div>
                            <div className="text-[0.62rem] text-[#8a7a5d] truncate">
                                {user?.primaryEmailAddress?.emailAddress}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-[0.08] pointer-events-none" />

                {/* Header with improved responsive layout */}
                <header className="h-14 border-b border-[#e8dfcf] flex items-center justify-between px-4 lg:px-6 bg-[#f7f3ea]/90 backdrop-blur z-10">
                    <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                        {!sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="text-[#6b5b3f] hover:text-[#17130c] p-1 transition-colors"
                                aria-label="Expand sidebar"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            </button>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                            <select
                                value={selectedModel}
                                onChange={(e) =>
                                    setSelectedModel(e.target.value)
                                }
                                className="bg-transparent text-[0.65rem] lg:text-[0.7rem] font-mono text-[#6b5b3f] hover:text-[#17130c] cursor-pointer border-none outline-none appearance-none uppercase tracking-widest"
                            >
                                {AVAILABLE_MODELS.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                            <span className="text-[#8a7a5d] hidden sm:inline">
                                /
                            </span>
                            <span className="text-[0.6rem] lg:text-[0.65rem] font-mono text-[#8a7a5d] uppercase tracking-widest hidden sm:inline">
                                {mode} MODE
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/canvas"
                            className="lp-btn-secondary h-8 px-2 lg:px-3 text-[0.6rem] lg:text-[0.65rem] whitespace-nowrap flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                            </svg>
                            <span className="hidden sm:inline">Canvas</span>
                        </Link>
                        {currentSession ? (
                            <>
                                <div className="relative" ref={exportMenuRef}>
                                    <button
                                        onClick={() => setExportMenuOpen((o) => !o)}
                                        className="lp-btn-secondary h-8 px-2 lg:px-3 text-[0.6rem] lg:text-[0.65rem] whitespace-nowrap flex items-center gap-1"
                                        title="Export"
                                    >
                                        <span>Export</span>
                                        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {exportMenuOpen && (
                                        <div className="absolute right-0 mt-1 w-36 rounded-lg border border-[#e8dfcf] bg-[#fdf8ed] shadow-lg z-50 overflow-hidden">
                                            <button
                                                onClick={() => { handleExport("md"); setExportMenuOpen(false); }}
                                                className="w-full text-left px-3 py-2 text-[0.65rem] font-mono text-[#3f3525] hover:bg-[#fff5e1] transition-colors"
                                            >
                                                MD
                                            </button>
                                            <button
                                                onClick={() => { handleExport("json"); setExportMenuOpen(false); }}
                                                className="w-full text-left px-3 py-2 text-[0.65rem] font-mono text-[#3f3525] hover:bg-[#fff5e1] transition-colors"
                                            >
                                                JSON
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleShare}
                                    className="lp-btn-secondary h-8 px-2 lg:px-3 text-[0.6rem] lg:text-[0.65rem] whitespace-nowrap transition-all"
                                >
                                    <span className="hidden sm:inline">
                                        {copied ? "Copied!" : "Share Blueprint"}
                                    </span>
                                    <span className="sm:hidden">{copied ? "Copied" : "Share"}</span>
                                </button>
                            </>
                        ) : (
                            <button
                                className="lp-btn-secondary h-8 px-2 lg:px-3 text-[0.6rem] lg:text-[0.65rem] whitespace-nowrap"
                                onClick={() => setCurrentSessionId(null)}
                            >
                                <span className="hidden sm:inline">
                                    New Session
                                </span>
                                <span className="sm:hidden">New</span>
                            </button>
                        )}
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </header>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 lg:p-6 relative"
                >
                    {currentSession ? (
                        <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 pb-32">
                            <div className="flex flex-col gap-2">
                                <div className="text-[#b2541f] text-xs lg:text-sm font-mono uppercase tracking-[0.2em] mb-2 animate-in">
                                    Session Active
                                </div>
                                <h1
                                    className="text-2xl lg:text-3xl font-extrabold tracking-tighter animate-in"
                                    style={{ animationDelay: "0.1s" }}
                                >
                                    {currentSession.title}
                                </h1>
                                <div
                                    className="flex flex-wrap gap-2 animate-in"
                                    style={{ animationDelay: "0.15s" }}
                                >
                                    <Tag
                                        text={currentSession.mode.toUpperCase()}
                                        color="#b2541f"
                                    />
                                    {currentSession.arxivId ? (
                                        <Tag
                                            text={`arXiv:${currentSession.arxivId}`}
                                            color="#2f8b6b"
                                        />
                                    ) : null}
                                </div>
                            </div>

                            {analyzing ? (
                                <div className="lp-card p-8 lg:p-12 flex flex-col items-center justify-center text-center space-y-4">
                                    <Spinner size={32} />
                                    <div className="space-y-1">
                                        <p className="text-xs lg:text-sm font-mono text-[#b2541f] animate-pulse uppercase tracking-widest">
                                            {statusText ||
                                                "Running Analysis..."}
                                        </p>
                                        <p className="text-[0.65rem] lg:text-xs text-[#6b5b3f] font-light">
                                            Streaming from Agno backend at
                                            localhost:8321
                                        </p>
                                    </div>
                                    <div className="w-full max-w-xs h-1 bg-[#e7dac2] rounded-full overflow-hidden mt-4">
                                        <div
                                            className="h-full bg-[#e86f2d] transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : !currentSession.data ? (
                                <div className="lp-card p-6 lg:p-8 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="text-[#8a7a5d] text-3xl"></div>
                                    <div className="space-y-1">
                                        <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">
                                            Awaiting Command
                                        </h3>
                                        <p className="text-[0.65rem] lg:text-xs text-[#8a7a5d]">
                                            Click Initialize Forge below to run
                                            this session.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            handleAnalyze(
                                                currentSession.arxivId,
                                                currentSession.mode,
                                                currentSession.inputText ||
                                                input ||
                                                currentSession.title,
                                            )
                                        }
                                        className="lp-btn-primary px-4 py-2 text-sm"
                                    >
                                        Initialize Forge
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in">
                                    <div className="lp-card p-4 lg:p-6">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
                                            <SectionLabel>
                                                Analysis Output
                                            </SectionLabel>
                                        </div>

                                        <div className="mt-4">
                                            {currentSession.mode === "paper" ? (
                                                <AnalysisReport data={currentSession.data.output as any} />
                                            ) : (
                                                <div className="space-y-3">
                                                    {getReadableSections(
                                                        currentSession.data.output,
                                                    ).map((section) => (
                                                        <div
                                                            key={section.title}
                                                            className="rounded-lg border border-[#eadfc9] bg-[#fff8eb] p-3"
                                                        >
                                                            <p className="text-[0.62rem] lg:text-[0.68rem] font-mono uppercase tracking-widest text-[#8a7a5d]">
                                                                {section.title}
                                                            </p>
                                                            <p className="mt-1 text-[#3f3525] text-[0.72rem] lg:text-[0.8rem] leading-relaxed whitespace-pre-wrap break-words">
                                                                {section.body}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {streamOutput && analyzing ? (
                                <div className="lp-card p-4 lg:p-6 mt-6">
                                    <SectionLabel>Live Stream</SectionLabel>
                                    <div className="mt-4">
                                        {(() => {
                                            const parsed = parseStreamedJson(streamOutput);
                                            // Only render as a report if it's paper mode and looks like our object
                                            if (mode === "paper" && parsed && typeof parsed === 'object') {
                                                return <AnalysisReport data={parsed} isStreaming={true} />;
                                            }
                                            return (
                                                <pre className="text-[#5b4e37] text-[0.7rem] lg:text-[0.8rem] leading-relaxed whitespace-pre-wrap break-words max-h-[60vh] overflow-auto bg-[#fffcf5] border border-[#eadfc9] p-4 rounded-xl">
                                                    {streamOutput}<span className="animate-blink text-[#e86f2d]">▌</span>
                                                </pre>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : null}

                            {error || currentSession.error ? (
                                <div className="rounded-xl border border-[#d9a9a9] bg-[#f7e8e8] text-[#8d2f2f] p-3 lg:p-4 text-xs lg:text-sm">
                                    {error || currentSession.error}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4 lg:px-6">
                            <div className="text-[#e86f2d] text-4xl lg:text-5xl mb-6 lg:mb-8 font-mono">
                                ⬡
                            </div>
                            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tighter mb-3 lg:mb-4 max-w-md">
                                What should we{" "}
                                <span className="text-[#e86f2d] font-mono italic">
                                    forge
                                </span>{" "}
                                today?
                            </h2>
                            <p className="text-[#5b4e37] text-xs lg:text-sm max-w-sm mb-8 lg:mb-12 font-light">
                                Ingest an arXiv paper or describe a product and
                                run the Agno backend from this dashboard.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 w-full max-w-2xl">
                                {[
                                    {
                                        t: "Extract SaaS Moats",
                                        d: "2409.13449",
                                        m: "paper" as AppMode,
                                    },
                                    {
                                        t: "SaaS R&D Boost",
                                        d: "A B2B CRM for biotech",
                                        m: "saas" as AppMode,
                                    },
                                    {
                                        t: "Constellation Map",
                                        d: "AI copilots for SOC workflows",
                                        m: "constellation" as AppMode,
                                    },
                                ].map((ex, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setMode(ex.m);
                                            setInput(ex.d);
                                        }}
                                        className="lp-card p-3 lg:p-4 text-left hover:border-[#eec681] transition-all group"
                                    >
                                        <div className="text-[0.65rem] lg:text-xs font-mono text-[#b2541f] uppercase mb-1 tracking-widest">
                                            {ex.m}
                                        </div>
                                        <div className="text-xs lg:text-xs font-bold mb-1">
                                            {ex.t}
                                        </div>
                                        <div className="text-[0.6rem] lg:text-[0.65rem] text-[#8a7a5d] font-mono line-clamp-2">
                                            &quot;{ex.d}&quot;
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Input area with improved responsive design */}
                <div className="p-4 lg:p-6 bg-gradient-to-t from-[#f3ead8] via-[#f6efe1]/95 to-transparent border-t border-[#e8dfcf] relative z-10">
                    <div className="max-w-4xl mx-auto space-y-3 lg:space-y-4">
                        <div className="flex justify-center gap-1.5 mb-2">
                            {(
                                ["paper", "constellation", "saas"] as AppMode[]
                            ).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-2 lg:px-3 py-1 rounded-full text-[0.55rem] lg:text-[0.6rem] font-mono uppercase tracking-[0.2em] transition-all border ${mode === m
                                        ? "bg-[#e86f2d] text-[#fff8eb] border-[#e86f2d] font-bold"
                                        : "bg-[#fdf8ed] text-[#6b5b3f] border-[#e5d9c3] hover:text-[#17130c]"
                                        }`}
                                >
                                    <span className="hidden sm:inline">
                                        {m === "constellation"
                                            ? " Constell"
                                            : m === "paper"
                                                ? " Ingest"
                                                : " SaaS"}
                                    </span>
                                    <span className="sm:hidden">
                                        {m === "constellation"
                                            ? ""
                                            : m === "paper"
                                                ? ""
                                                : ""}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="lp-card p-1.5 focus-within:border-[#eec681] transition-all shadow-[0_20px_50px_-35px_rgba(23,19,12,0.4)]">
                            <div className="flex flex-col gap-2">
                                {detectedArxivId && (
                                    <div className="px-3 pt-2">
                                        <span className="inline-flex items-center gap-2 bg-[#fdf0df] border border-[#f0cb94] rounded px-2 py-1 text-[0.6rem] lg:text-[0.65rem] font-mono text-[#b2541f] animate-in">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#e86f2d] animate-pulse" />
                                            <span className="hidden sm:inline">
                                                TARGET ARXIV:
                                            </span>
                                            {detectedArxivId}
                                            <button
                                                onClick={() =>
                                                    setInput(
                                                        input.replace(
                                                            detectedArxivId,
                                                            "",
                                                        ),
                                                    )
                                                }
                                                className="hover:text-[#17130c] ml-1 text-xs"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-end gap-2 p-2">
                                    <textarea
                                        value={input}
                                        onChange={(e) =>
                                            setInput(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault();
                                                handleAnalyze();
                                            }
                                        }}
                                        placeholder={
                                            mode === "paper"
                                                ? canSubmitWithSessionPaper
                                                    ? `Ask about this paper (arXiv:${currentSession?.arxivId}) or paste a new arXiv ID to switch...`
                                                    : "Input arXiv ID or URL to distill blueprint..."
                                                : mode === "constellation"
                                                    ? "Describe the idea or market you want mapped..."
                                                    : "Describe your SaaS product to find R&D boosts..."
                                        }
                                        className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1 text-sm text-[#17130c] placeholder:text-[#8a7a5d] min-h-[44px] max-h-32"
                                        rows={1}
                                        disabled={analyzing}
                                    />
                                    <button
                                        onClick={() => handleAnalyze()}
                                        disabled={
                                            analyzing ||
                                            (!input.trim() &&
                                                !canSubmitWithSessionPaper)
                                        }
                                        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${(input.trim() || canSubmitWithSessionPaper)
                                            ? "bg-[#e86f2d] text-[#fff9eb] scale-100 hover:scale-105"
                                            : "bg-[#efe3cc] text-[#8a7a5d] scale-90"
                                            }`}
                                        aria-label="Submit"
                                    >
                                        {analyzing ? (
                                            <Spinner
                                                size={16}
                                                color="#17130c"
                                            />
                                        ) : (
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2.5}
                                                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6">
                            <p className="text-[0.5rem] lg:text-[0.55rem] font-mono text-[#8a7a5d] uppercase tracking-[0.3em] text-center">
                                <span className="hidden sm:inline">
                                    ENTER TO FORGE
                                </span>
                                <span className="sm:hidden">↵ TO FORGE</span>
                            </p>
                            <p className="text-[0.5rem] lg:text-[0.55rem] font-mono text-[#8a7a5d] uppercase tracking-[0.3em] text-center">
                                AGNO BACKEND :8321
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
