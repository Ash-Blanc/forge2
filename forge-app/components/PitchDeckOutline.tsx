"use client";

import React from "react";
import { ForgeAnalysis } from "@/lib/types";

interface PitchDeckOutlineProps {
    data: Partial<ForgeAnalysis>;
}

export function PitchDeckOutline({ data }: PitchDeckOutlineProps) {
    if (!data) return null;

    const slides = [
        { title: "1. Problem & Opportunity", content: data.opportunity },
        { title: "2. The Innovation", content: data.coreInnovation },
        { title: "3. Target Customer", content: data.targetCustomer },
        { title: "4. Market Size (TAM)", content: data.marketSize },
        { title: "5. Competitive Moat", content: data.moatAnalysis },
        { title: "6. Execution Plan", content: data.first90Days?.join(" ") }
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300 mt-6 pt-6 border-t border-[#eadfc9]">
            <h3 className="text-sm font-mono uppercase tracking-widest text-[#b2541f] mb-4 font-bold">
                Investor Pitch Deck Outline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slides.map((slide, i) => (
                    slide.content ? (
                        <div key={i} className="rounded-xl border border-[#eadfc9] bg-[#fffdfa] p-4 shadow-sm">
                            <h4 className="text-[0.65rem] font-mono uppercase tracking-widest text-[#8a7a5d] mb-2 font-bold">
                                {slide.title}
                            </h4>
                            <p className="text-[#5b4e37] text-xs leading-relaxed line-clamp-4 text-elipsis">
                                {slide.content}
                            </p>
                        </div>
                    ) : null
                ))}
            </div>
        </div>
    );
}
