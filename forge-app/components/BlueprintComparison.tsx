"use client";

import React from "react";
import { ForgeAnalysis } from "@/lib/types";

interface BlueprintComparisonProps {
    blueprintA: Partial<ForgeAnalysis>;
    blueprintB: Partial<ForgeAnalysis>;
    labelA?: string;
    labelB?: string;
}

export function BlueprintComparison({
    blueprintA,
    blueprintB,
    labelA = "Version A",
    labelB = "Version B"
}: BlueprintComparisonProps) {
    if (!blueprintA || !blueprintB) return null;

    const renderComparisonRow = (
        title: string,
        valA: string | React.ReactNode,
        valB: string | React.ReactNode,
        isHighlight = false
    ) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-[#eadfc9]">
            <div className="relative">
                <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2">
                    {title} ({labelA})
                </h4>
                <div className={`text-sm leading-relaxed ${isHighlight ? "font-medium text-[#b2541f]" : "text-[#5b4e37]"}`}>
                    {valA || <span className="text-gray-400 italic">N/A</span>}
                </div>
            </div>
            <div className="relative mt-4 md:mt-0 md:pl-4 md:border-l md:border-dashed md:border-[#eadfc9]">
                <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2">
                    {title} ({labelB})
                </h4>
                <div className={`text-sm leading-relaxed ${isHighlight ? "font-medium text-[#b2541f]" : "text-[#5b4e37]"}`}>
                    {valB || <span className="text-gray-400 italic">N/A</span>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-2 animate-in fade-in duration-300">
            <div className="rounded-xl border border-[#eadfc9] bg-white p-5 shadow-sm">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#b2541f] mb-4 font-bold flex items-center gap-2">
                    Blueprint Comparison
                </h3>

                {renderComparisonRow("Opportunity", blueprintA.opportunity, blueprintB.opportunity, true)}
                {renderComparisonRow("Target Customer", blueprintA.targetCustomer, blueprintB.targetCustomer)}
                {renderComparisonRow("Innovation", blueprintA.coreInnovation, blueprintB.coreInnovation)}
                {renderComparisonRow("Market Size", blueprintA.marketSize, blueprintB.marketSize)}
                {renderComparisonRow("Defensibility", blueprintA.moatAnalysis, blueprintB.moatAnalysis)}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div>
                        <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2">
                            First 90 Days ({labelA})
                        </h4>
                        <ul className="list-disc pl-4 text-sm text-[#5b4e37] space-y-1">
                            {blueprintA.first90Days?.map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                            )) || <li className="text-gray-400 italic list-none -ml-4">N/A</li>}
                        </ul>
                    </div>
                    <div className="md:pl-4 md:border-l md:border-dashed md:border-[#eadfc9]">
                        <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2">
                            First 90 Days ({labelB})
                        </h4>
                        <ul className="list-disc pl-4 text-sm text-[#5b4e37] space-y-1">
                            {blueprintB.first90Days?.map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                            )) || <li className="text-gray-400 italic list-none -ml-4">N/A</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
