"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const TRUST_BADGES = ["Founders", "Indie Hackers", "Product Engineers", "Research Teams"];

const OUTCOMES = [
    { label: "Hours saved per idea", value: "12+" },
    { label: "Papers translated weekly", value: "2,400+" },
    { label: "Average first prototype time", value: "5 days" },
];

const WORKFLOW = [
    {
        title: "Drop In A Paper",
        desc: "Paste arXiv links, PDFs, or topics. Forge extracts methods, assumptions, and implementation constraints.",
    },
    {
        title: "See The Business Angle",
        desc: "Get market gaps, ICP suggestions, pricing options, and moat analysis grounded in the research.",
    },
    {
        title: "Ship With A Playbook",
        desc: "Receive build milestones, key risks, and launch priorities so your team can execute quickly.",
    },
];

const PROOF_POINTS = [
    "From paper to MVP scope in one session",
    "Prioritized backlog with technical moat callouts",
    "Competitor map tied to real market language",
];

const TESTIMONIALS = [
    {
        quote: "We turned one niche paper into a working pilot and three paid design-partner calls in the same week.",
        author: "Ari, founder at a B2B ops startup",
    },
    {
        quote: "Forge helped us skip vague brainstorming and focus on one defensible angle our team could actually ship.",
        author: "Maya, product lead at a 6-person AI team",
    },
];

export default function LandingPage() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const trackCta = (ctaId: string, destination: string) => {
        if (typeof window === "undefined") return;

        const detail = {
            ctaId,
            destination,
            pagePath: window.location.pathname,
            ts: Date.now(),
        };

        window.dispatchEvent(new CustomEvent("forge:cta_click", { detail }));

        const gtag = (window as Window & {
            gtag?: (command: string, eventName: string, params: Record<string, string>) => void;
        }).gtag;

        if (gtag) {
            gtag("event", "forge_cta_click", {
                cta_id: ctaId,
                destination,
                page_path: window.location.pathname,
            });
        }
    };

    const navigateWithTracking = (ctaId: string, destination: string) => {
        trackCta(ctaId, destination);
        router.push(destination);
    };

    const goToMainCta = (ctaId: string) => {
        const destination = isSignedIn ? "/dashboard" : "/sign-in";
        navigateWithTracking(ctaId, destination);
    };

    return (
        <div className="lp-shell font-sans flex flex-col">
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
                    scrollY > 16 ? "lp-nav-scrolled" : "bg-transparent"
                }`}
            >
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => router.push("/")} className="flex items-center gap-2">
                        <span className="font-black tracking-tight text-lg">FORGE</span>
                        <span className="text-[#e86f2d] text-lg">⬡</span>
                    </button>
                    <div className="flex items-center gap-3">
                        {!isSignedIn ? (
                            <button
                                data-cta-id="nav-sign-in"
                                onClick={() => navigateWithTracking("nav-sign-in", "/sign-in")}
                                className="text-sm font-medium text-[#5a4d36] hover:text-[#17130c]"
                            >
                                Sign in
                            </button>
                        ) : null}
                        <button
                            data-cta-id="nav-main-cta"
                            onClick={() => goToMainCta("nav-main-cta")}
                            className="lp-btn-dark px-4 py-2 text-sm"
                        >
                            {isSignedIn ? "Open Dashboard" : "Get Started"}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-28 pb-20 px-6">
                <section className="max-w-6xl mx-auto">
                    <div className="lp-reveal inline-flex items-center gap-2 rounded-full bg-[#fff9eb] border border-[#eadfc9] px-4 py-1 text-xs font-semibold tracking-wide text-[#5f4e33]">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#4b9a72]" />
                        BUILT FOR TECHNICAL FOUNDERS
                    </div>
                    <div className="mt-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
                        <div className="lp-reveal">
                            <h1 className="text-[clamp(2.2rem,6vw,4.6rem)] font-black leading-[1.03] tracking-tight">
                                Turn research papers
                                <br />
                                into startup plans
                                <br />
                                people pay for.
                            </h1>
                            <p className="mt-6 text-[1.08rem] leading-relaxed max-w-xl text-[#50452f]">
                                Forge transforms dense technical research into validated SaaS opportunities, product scopes,
                                and launch-ready execution plans.
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                <button
                                    data-cta-id="hero-primary"
                                    onClick={() => goToMainCta("hero-primary")}
                                    className="lp-btn-primary px-6 py-3 text-base"
                                >
                                    Get Your First Blueprint
                                </button>
                                <button
                                    data-cta-id="hero-how-it-works"
                                    onClick={() => {
                                        trackCta("hero-how-it-works", "#how-it-works");
                                        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className="lp-btn-secondary px-6 py-3 text-base"
                                >
                                    See How It Works
                                </button>
                            </div>
                            <p className="mt-4 text-sm text-[#736548]">No setup friction. Start in under 2 minutes.</p>
                        </div>

                        <div className="lp-card lp-reveal p-6 md:p-8 shadow-[0_20px_50px_-30px_rgba(23,19,12,0.45)]">
                            <p className="text-xs tracking-wide font-bold text-[#7b6947]">LIVE OUTPUT PREVIEW</p>
                            <h3 className="mt-3 text-xl font-extrabold leading-snug">
                                Multi-agent teardown:
                                <br />
                                <span className="text-[#e86f2d]">&quot;Synthetic Data For Healthcare AI&quot;</span>
                            </h3>
                            <ul className="mt-5 space-y-3 text-sm text-[#4e432e]">
                                {PROOF_POINTS.map((point) => (
                                    <li key={point} className="flex items-start gap-2">
                                        <span className="mt-1 h-2 w-2 rounded-full bg-[#e86f2d]" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                data-cta-id="preview-generate"
                                onClick={() => goToMainCta("preview-generate")}
                                className="lp-btn-dark mt-6 w-full py-3"
                            >
                                Generate My Breakdown
                            </button>
                        </div>
                    </div>

                    <div className="mt-14 border-y border-[#e8dfcf] py-5">
                        <p className="text-xs uppercase tracking-[0.16em] text-[#7b6947]">Used by teams from</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3 text-[#3e3424] font-semibold">
                            {TRUST_BADGES.map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="max-w-6xl mx-auto mt-20">
                    <div className="max-w-2xl">
                        <p className="text-xs font-bold tracking-[0.16em] text-[#7b6947] uppercase">How It Works</p>
                        <h2 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">Designed for speed and conviction.</h2>
                    </div>
                    <div className="mt-8 grid md:grid-cols-3 gap-4">
                        {WORKFLOW.map((step, index) => (
                            <div key={step.title} className="lp-card p-6">
                                <p className="text-xs font-bold text-[#7b6947]">STEP {index + 1}</p>
                                <h3 className="mt-3 text-xl font-bold">{step.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#5b4f37]">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="max-w-6xl mx-auto mt-20">
                    <div className="rounded-3xl border border-[#e4d7be] bg-[#f3ead8] text-[#17130c] px-6 py-10 md:px-10">
                        <p className="text-xs font-bold tracking-[0.16em] text-[#7b6947] uppercase">Impact</p>
                        <div className="mt-6 grid sm:grid-cols-3 gap-8">
                            {OUTCOMES.map((item) => (
                                <div key={item.label}>
                                    <p className="text-3xl md:text-4xl font-black">{item.value}</p>
                                    <p className="mt-2 text-sm text-[#5b4e37]">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="max-w-6xl mx-auto mt-20">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight">What founders say after their first session.</h2>
                    <div className="mt-8 grid md:grid-cols-2 gap-4">
                        {TESTIMONIALS.map((item) => (
                            <div key={item.author} className="lp-card p-6">
                                <p className="text-[#2f281b] leading-relaxed">&quot;{item.quote}&quot;</p>
                                <p className="mt-4 text-sm font-semibold text-[#6d5e42]">{item.author}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="max-w-6xl mx-auto mt-20">
                    <div className="rounded-3xl border border-[#eadfc9] bg-[#fffaf0] p-8 md:p-12 text-center">
                        <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                            Build with more signal.
                            <br />
                            Guess less. Ship faster.
                        </h2>
                        <p className="mt-5 max-w-2xl mx-auto text-[#5c5037]">
                            Join teams turning technical breakthroughs into products with real customer pull.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                            <button
                                data-cta-id="final-start-building"
                                onClick={() => goToMainCta("final-start-building")}
                                className="lp-btn-primary px-8 py-3 text-base"
                            >
                                Start Building
                            </button>
                            <button
                                data-cta-id="final-explore-dashboard"
                                onClick={() => navigateWithTracking("final-explore-dashboard", "/dashboard")}
                                className="lp-btn-secondary bg-white px-8 py-3 text-base"
                            >
                                Explore Dashboard
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#e8dfcf] py-10 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold">FORGE</span>
                        <span className="text-[#e86f2d]">⬡</span>
                    </div>
                    <p className="text-sm text-[#7b6947]"> {new Date().getFullYear()} Forge Labs.</p>
                    <div className="flex items-center gap-6 text-sm text-[#7b6947]">
                        <button
                            data-cta-id="footer-get-started"
                            onClick={() => navigateWithTracking("footer-get-started", "/sign-in")}
                            className="hover:text-[#17130c]"
                        >
                            Get started
                        </button>
                        <button
                            data-cta-id="footer-product"
                            onClick={() => navigateWithTracking("footer-product", "/dashboard")}
                            className="hover:text-[#17130c]"
                        >
                            Product
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
