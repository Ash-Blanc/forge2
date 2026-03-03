"use client";

import { Tldraw, Editor, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui';

interface Session {
    id: string;
    title: string;
    mode: string;
    created_at: string;
    data?: {
        output?: any;
    };
}

export default function CanvasPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState<Editor | null>(null);

    useEffect(() => {
        async function fetchSessions() {
            try {
                const res = await fetch("/api/sessions");
                if (res.ok) {
                    const data = await res.json();
                    setSessions(data);
                }
            } catch (error) {
                console.error("Failed to fetch sessions:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchSessions();
    }, []);

    const handleMount = useCallback((editor: Editor) => {
        setEditor(editor);
    }, []);

    useEffect(() => {
        if (!editor || sessions.length === 0) return;

        // Check if we already have shapes to avoid duplicate rendering on every re-render
        // We only auto-render if the canvas is empty (initial state)
        const shapes = editor.getCurrentPageShapes();
        if (shapes.length > 0) return;

        const shapesToCreate: any[] = [];
        let x = 100;
        let y = 100;
        const boxWidth = 250;
        const boxHeight = 150;
        const horizontalSpacing = 350;
        const verticalSpacing = 250;

        // Sort sessions by date (oldest first for the pipeline flow)
        const sortedSessions = [...sessions].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        sortedSessions.forEach((session, index) => {
            const shapeId = createShapeId(`session-${session.id}`);
            
            // Determine color based on mode
            let color: 'blue' | 'green' | 'orange' | 'black' = 'black';
            if (session.mode === 'paper') color = 'blue';
            else if (session.mode === 'saas') color = 'green';
            else if (session.mode === 'constellation') color = 'orange';

            // 1. Create the Box
            shapesToCreate.push({
                id: shapeId,
                type: 'geo',
                x,
                y,
                props: {
                    geo: 'rectangle',
                    w: boxWidth,
                    h: boxHeight,
                    text: `${session.mode.toUpperCase()}

${session.title}`,
                    font: 'mono',
                    align: 'middle',
                    verticalAlign: 'middle',
                    fill: 'semi',
                    color: color,
                    dash: 'draw',
                    size: 'm',
                },
            });

            // 2. Create the Arrow (Pipeline connection)
            if (index > 0) {
                const prevSession = sortedSessions[index - 1];
                const arrowId = createShapeId(`arrow-${prevSession.id}-${session.id}`);
                
                // Calculate arrow positions (from right side of prev to left side of current)
                // If it wrapped to a new line, we handle that differently
                const isWrapped = x === 100;
                
                if (!isWrapped) {
                    shapesToCreate.push({
                        id: arrowId,
                        type: 'arrow',
                        x: x - (horizontalSpacing - boxWidth),
                        y: y + (boxHeight / 2),
                        props: {
                            start: { x: 0, y: 0 },
                            end: { x: horizontalSpacing - boxWidth, y: 0 },
                            bend: 0,
                            color: 'grey',
                            dash: 'draw',
                            size: 's',
                        },
                    });
                }
            }

            // Advance positions
            x += horizontalSpacing;
            if (x > 1200) {
                x = 100;
                y += verticalSpacing;
            }
        });

        editor.createShapes(shapesToCreate);
        
        // Final polish: center the view
        setTimeout(() => {
            editor.zoomToFit();
        }, 100);

    }, [editor, sessions]);

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[#f7f3ea]">
                <Spinner size={32} />
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f7f3ea]">
            <header className="h-14 border-b border-[#e8dfcf] flex items-center justify-between px-6 bg-[#f7f3ea]/90 backdrop-blur z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-[#6b5b3f] hover:text-[#17130c] p-1 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-lg tracking-tighter">FORGE</span>
                        <span className="text-[#e86f2d] text-xl">⬡</span>
                        <span className="text-[#8a7a5d] ml-2">/</span>
                        <span className="text-[0.65rem] font-mono text-[#8a7a5d] uppercase tracking-widest">
                            CANVAS MODE
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[0.6rem] font-mono text-[#8a7a5d] uppercase tracking-[0.2em]">
                        {sessions.length} NODES DISCOVERED
                    </span>
                    <Link href="/dashboard" className="lp-btn-secondary h-8 px-4 text-[0.65rem] flex items-center">
                        BACK TO DASHBOARD
                    </Link>
                </div>
            </header>
            <div className="flex-1 relative">
                <Tldraw 
                    persistenceKey="forge-canvas"
                    autoFocus
                    inferDarkMode={false}
                    onMount={handleMount}
                />
            </div>
        </div>
    );
}
