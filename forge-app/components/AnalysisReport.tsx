"use client";

import React from "react";
import { ForgeAnalysis } from "@/lib/types";
import { Tag } from "./ui";

interface AnalysisReportProps {
    data: Partial<ForgeAnalysis>;
    isStreaming?: boolean;
}

export function AnalysisReport({ data: initialData, isStreaming = false }: AnalysisReportProps) {
    if (!initialData || typeof initialData !== "object") return null;

    // Handle case where Agno returns { analysis: { opportunity: ... } } depending on the parsing logic
    const data: Partial<ForgeAnalysis> = (initialData as any).analysis ? (initialData as any).analysis : initialData;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Overview Section */}
            {(data.opportunity || data.narrativeAnalysis) && (
                <div className="space-y-4">
                    {data.opportunity && (
                        <div className="rounded-xl border border-[#eadfc9] bg-gradient-to-br from-[#fffdfa] to-[#fff8eb] p-5 shadow-sm">
                            <h3 className="text-xs font-mono uppercase tracking-widest text-[#b2541f] mb-2 font-bold flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e86f2d] inline-block" />
                                Core Opportunity
                            </h3>
                            <p className="text-[#3f3525] text-lg font-medium leading-snug">
                                {data.opportunity}
                                {isStreaming && !data.coreInnovation && <span className="animate-blink text-[#e86f2d]">▌</span>}
                            </p>
                        </div>
                    )}

                    {data.narrativeAnalysis && (
                        <div className="rounded-xl border border-[#eadfc9] bg-[#fffcf5] p-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                            <h3 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2 font-bold">The Narrative</h3>
                            <p className="text-[#5b4e37] text-sm leading-relaxed whitespace-pre-wrap">
                                {data.narrativeAnalysis}
                                {isStreaming && data.narrativeAnalysis && !data.tags && <span className="animate-blink text-[#e86f2d]">▌</span>}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Grid for details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.coreInnovation && (
                    <div className="rounded-xl border border-[#eadfc9] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2">
                            Technical Breakthrough
                        </h4>
                        <p className="text-[#3f3525] text-sm leading-relaxed">
                            {data.coreInnovation}
                            {isStreaming && data.coreInnovation && !data.targetCustomer && <span className="animate-blink text-[#e86f2d]">▌</span>}
                        </p>
                    </div>
                )}

                {data.targetCustomer && (
                    <div className="rounded-xl border border-[#eadfc9] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2">
                            Ideal Customer Profile
                        </h4>
                        <p className="text-[#3f3525] text-sm leading-relaxed">
                            {data.targetCustomer}
                            {isStreaming && data.targetCustomer && !data.marketSize && <span className="animate-blink text-[#2f8b6b]">▌</span>}
                        </p>
                    </div>
                )}

                {data.marketSize && (
                    <div className="rounded-xl border border-[#eadfc9] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2">
                            Market Size (TAM)
                        </h4>
                        <p className="text-[#3f3525] text-sm font-medium">
                            {data.marketSize}
                            {isStreaming && data.marketSize && !data.buildComplexity && <span className="animate-blink text-[#1a5b82]">▌</span>}
                        </p>
                    </div>
                )}

                {data.moatAnalysis && (
                    <div className="rounded-xl border border-dashed border-[#d2c2a3] bg-[#fbf6ec] p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#eadfc9] opacity-30 blur-2xl rounded-full" />
                        <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2 relative z-10">
                            Defensibility / Moat
                        </h4>
                        <p className="text-[#5b4e37] text-sm leading-relaxed relative z-10 italic">
                            {data.moatAnalysis}
                            {isStreaming && data.moatAnalysis && !data.first90Days && <span className="animate-blink text-[#6b5b3f]">▌</span>}
                        </p>
                    </div>
                )}
            </div>

            {/* Execution / First 90 Days */}
            {data.first90Days && Array.isArray(data.first90Days) && data.first90Days.length > 0 && (
                <div className="rounded-xl border-t border-b sm:border border-[#eadfc9] sm:bg-white py-4 sm:p-5">
                    <h3 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-4 font-bold flex items-center justify-between">
                        The First 90 Days
                        <span className="text-[10px] font-normal tracking-normal text-[#b2541f] bg-[#fff5e1] px-2 py-0.5 rounded-full border border-[#f0cb94]">Execution Plan</span>
                    </h3>

                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#eadfc9] before:to-transparent">
                        {data.first90Days.map((step: string, idx: number) => {
                            if (!step) return null;
                            const isStreamingStep = isStreaming && idx === data.first90Days!.length - 1 && !data.narrativeAnalysis;

                            // Try to split bold/title from the step text if it matches a pattern like "Day x: Description"
                            let title = "";
                            let desc = step;
                            const colonIdx = step.indexOf(":");
                            if (colonIdx > 0 && colonIdx < 15) {
                                title = step.substring(0, colonIdx + 1);
                                desc = step.substring(colonIdx + 1).trim();
                            }

                            return (
                                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-in slide-in-from-bottom-2 fade-in fill-mode-both" style={{ animationDelay: `${idx * 150}ms` }}>
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-[#e86f2d] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    </div>
                                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-[#eadfc9] bg-white shadow-sm transition-all hover:shadow-md hover:border-[#ded1b5]">
                                        {title ? (
                                            <>
                                                <span className="font-bold text-[#b2541f] text-xs mr-2">{title}</span>
                                                <span className="text-[#3f3525] text-sm">{desc}</span>
                                            </>
                                        ) : (
                                            <span className="text-[#3f3525] text-sm">{step}</span>
                                        )}
                                        {isStreamingStep && <span className="animate-blink text-[#e86f2d] ml-1">▌</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer Metrics */}
            {((data.buildComplexity || data.mvpDays || (data.tags && data.tags.length > 0)) && (
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#eadfc9]/50">
                    {data.buildComplexity && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[0.6rem] font-mono text-[#8a7a5d] uppercase tracking-wider">Complexity</span>
                            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${data.buildComplexity.toLowerCase() === 'high' ? 'bg-[#f7e8e8] text-[#8d2f2f] border border-[#d9a9a9]' :
                                data.buildComplexity.toLowerCase() === 'medium' ? 'bg-[#fff5e1] text-[#b2541f] border border-[#f0cb94]' :
                                    'bg-[#e9f4f0] text-[#2f8b6b] border border-[#a2d3be]'
                                }`}>
                                {data.buildComplexity}
                            </span>
                        </div>
                    )}

                    {data.mvpDays && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[0.6rem] font-mono text-[#8a7a5d] uppercase tracking-wider">MVP Time</span>
                            <span className="text-[0.7rem] font-bold text-[#3f3525]">~{data.mvpDays} days</span>
                        </div>
                    )}

                    <div className="flex-1" />

                    {data.tags && (
                        <div className="flex gap-1.5 flex-wrap">
                            {data.tags.map((tag: string) => (
                                <Tag key={tag} text={tag} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
