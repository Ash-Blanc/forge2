"use client";
// components/SubmitModal.tsx

import { useState, useMemo } from "react";
import { Spinner } from "./ui";
import { AnalysisReport } from "./AnalysisReport";
import { parseStreamedJson } from "@/lib/parseStreamedJson";
import type { ForgeUser, ForgeAnalysis } from "@/lib/types";
import type { ArxivMeta } from "@/lib/arxiv";

interface Props {
    user: ForgeUser;
    onPublish: (arxivId: string, meta: ArxivMeta, analysis: ForgeAnalysis) => Promise<void>;
    onClose: () => void;
}

type Step = "input" | "fetching" | "fetch-err" | "analyzing" | "done" | "publishing";

export default function SubmitModal({ user, onPublish, onClose }: Props) {
    const [step, setStep] = useState<Step>("input");
    const [arxivId, setArxivId] = useState("");
    const [errMsg, setErrMsg] = useState("");
    const [meta, setMeta] = useState<ArxivMeta | null>(null);
    const [analysis, setAnalysis] = useState<ForgeAnalysis | null>(null);
    const [streamRaw, setStreamRaw] = useState("");
    const [manualMode, setManualMode] = useState(false);
    const [manualTitle, setManualTitle] = useState("");
    const [manualAbstract, setManualAbstract] = useState("");

    const runAnalysis = async (paperMeta: ArxivMeta) => {
        setMeta(paperMeta);
        setStep("analyzing");
        setStreamRaw("");

        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paperMeta),
            });
            if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);

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
                        if (ev.type === "delta") setStreamRaw(ev.text);
                        if (ev.type === "done") { setAnalysis(ev.analysis); setStep("done"); }
                        if (ev.type === "error") throw new Error(ev.message);
                    } catch { /* partial */ }
                }
            }
        } catch (e: unknown) {
            setErrMsg(e instanceof Error ? e.message : "Analysis failed");
            setStep(manualMode ? "fetch-err" : "input");
        }
    };

    const handleFetch = async () => {
        if (!arxivId.trim()) return;
        setStep("fetching"); setErrMsg("");
        try {
            const res = await fetch(`/api/arxiv?id=${encodeURIComponent(arxivId.trim())}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Fetch failed");
            await runAnalysis(data as ArxivMeta);
        } catch (e: unknown) {
            setErrMsg(e instanceof Error ? e.message : "Fetch failed");
            setStep("fetch-err");
        }
    };

    const handleManual = async () => {
        if (!manualTitle.trim() || !manualAbstract.trim()) return;
        await runAnalysis({ title: manualTitle.trim(), abstract: manualAbstract.trim(), authors: [], published: "" });
    };

    const handlePublish = async () => {
        if (!meta || !analysis) return;
        setStep("publishing");
        await onPublish(arxivId.trim() || "manual", meta, analysis);
        onClose();
    };

    const isLoading = step === "fetching" || step === "analyzing" || step === "publishing";
    const showInput = (step === "input" || step === "fetch-err") && !manualMode;
    const showManual = (step === "input" || step === "fetch-err") && manualMode;

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16,
            }}
        >
            <div style={{
                background: "var(--surface)", border: "1px solid var(--border-h)",
                borderRadius: 16, padding: "22px 24px", width: 460, maxWidth: "100%",
                maxHeight: "88dvh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.6)",
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                        <h2 style={{ color: "var(--text)", fontSize: ".9375rem", fontWeight: 700, marginBottom: 3 }}>Submit a Paper</h2>
                        <p style={{ color: "var(--muted)", fontSize: ".69rem", fontFamily: "var(--mono)" }}>
                            {showInput && "Enter an arXiv ID — FORGE will extract the opportunity"}
                            {showManual && "Paste title and abstract to analyze manually"}
                            {step === "fetching" && "Fetching from arXiv…"}
                            {step === "analyzing" && "AI analyzing…"}
                            {step === "done" && "Review and publish"}
                            {step === "publishing" && "Publishing…"}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>

                {/* Error */}
                {errMsg && (
                    <div style={{ background: "var(--red-dim)", border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", borderRadius: "var(--r-md)", padding: "7px 11px", color: "var(--red)", fontSize: ".72rem", fontFamily: "var(--mono)", marginBottom: 12 }}>
                        {errMsg}
                    </div>
                )}

                {/* Input */}
                {showInput && (
                    <>
                        <label style={{ color: "var(--muted)", fontSize: ".63rem", fontFamily: "var(--mono)", display: "block", marginBottom: 5, letterSpacing: ".06em", textTransform: "uppercase" }}>arXiv ID</label>
                        <input
                            value={arxivId}
                            onChange={e => setArxivId(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleFetch()}
                            placeholder="e.g. 2501.12345 or 2501.12345v2"
                            className="field"
                            style={{ fontFamily: "var(--mono)", marginBottom: 10 }}
                            autoFocus
                        />
                        <button onClick={handleFetch} disabled={!arxivId.trim()} className="btn-primary" style={{ width: "100%", padding: "10px", marginBottom: 8 }}>
                            Analyze →
                        </button>
                        <button onClick={() => { setManualMode(true); setErrMsg(""); }} className="btn-ghost" style={{ width: "100%", padding: "8px" }}>
                            Paste title + abstract instead
                        </button>
                    </>
                )}

                {/* Manual */}
                {showManual && (
                    <>
                        <label style={{ color: "var(--muted)", fontSize: ".63rem", fontFamily: "var(--mono)", display: "block", marginBottom: 5, letterSpacing: ".06em", textTransform: "uppercase" }}>Title</label>
                        <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Full paper title" className="field" style={{ marginBottom: 10 }} />
                        <label style={{ color: "var(--muted)", fontSize: ".63rem", fontFamily: "var(--mono)", display: "block", marginBottom: 5, letterSpacing: ".06em", textTransform: "uppercase" }}>Abstract</label>
                        <textarea value={manualAbstract} onChange={e => setManualAbstract(e.target.value)} placeholder="Paste the abstract here…" className="field" rows={5} style={{ marginBottom: 10 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setManualMode(false); setErrMsg(""); }} className="btn-ghost" style={{ padding: "9px 14px" }}>← Back</button>
                            <button onClick={handleManual} disabled={!manualTitle.trim() || !manualAbstract.trim()} className="btn-primary" style={{ flex: 1, padding: "9px" }}>Analyze →</button>
                        </div>
                    </>
                )}

                {/* Loading */}
                {isLoading && step !== "publishing" && (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                        <Spinner size={28} />
                        <p style={{ color: "var(--text)", fontSize: ".875rem", fontWeight: 600, marginTop: 14, marginBottom: 4 }}>
                            {step === "fetching" ? "Fetching from arXiv…" : "FORGE AI reading the paper…"}
                        </p>
                        {streamRaw && (
                            <div style={{ marginTop: 24, textAlign: "left" }}>
                                {(() => {
                                    const parsed = parseStreamedJson(streamRaw);
                                    if (parsed && typeof parsed === 'object') {
                                        return <AnalysisReport data={parsed} isStreaming={true} />;
                                    }
                                    return (
                                        <div style={{ background: "var(--bg)", borderRadius: "var(--r-md)", padding: "12px 14px", overflow: "hidden", position: "relative", border: "1px solid var(--border)" }}>
                                            <div style={{ color: "var(--faint)", fontSize: ".65rem", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: ".05em" }}>LIVE OUTPUT</div>
                                            <pre style={{ color: "var(--text)", fontSize: ".7rem", fontFamily: "var(--mono)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                                {streamRaw.slice(-800)}<span className="animate-blink" style={{ color: "var(--accent)" }}>▌</span>
                                            </pre>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* Publishing spinner */}
                {step === "publishing" && (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                        <Spinner size={24} />
                        <p style={{ color: "var(--muted)", fontSize: ".8rem", fontFamily: "var(--mono)", marginTop: 12 }}>Publishing…</p>
                    </div>
                )}

                {/* Done — review */}
                {step === "done" && analysis && meta && (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <h3 style={{ color: "var(--text)", fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>{meta.title}</h3>
                            <AnalysisReport data={analysis} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setStep("input"); setAnalysis(null); setStreamRaw(""); }} className="btn-ghost" style={{ padding: "9px 14px" }}>Re-analyze</button>
                            <button onClick={handlePublish} className="btn-primary" style={{ flex: 1, padding: "11px" }}>Publish →</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
