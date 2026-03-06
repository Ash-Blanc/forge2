import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

// Modern Supabase keys: sb_secret_ (server) or sb_publishable_ (client)
// Legacy keys: service_role JWT (ey...) or anon JWT (ey...)
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prefer secret key for server-side operations, fall back to publishable
const key = secretKey || publishableKey;

if (!url || !key) {
    throw new Error(
        "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SECRET_KEY (sb_secret_...) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
    );
}

if (!secretKey && publishableKey) {
    console.warn("Using publishable key for server-side Supabase client. For write operations that bypass RLS, set SUPABASE_SECRET_KEY (sb_secret_...).");
}

export const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
});

export type DBAnalysisSession = {
    id: string;
    user_id: string;
    mode: "paper" | "saas" | "constellation";
    title: string;
    input_text: string | null;
    arxiv_id: string | null;
    meta: Record<string, unknown> | null;
    output: Record<string, unknown> | string | null;
    output_text: string | null;
    error: string | null;
    created_at: string;
    updated_at: string;
};

/**
 * Creates a Supabase client that can be used with a user's JWT.
 * This is essential for Row Level Security (RLS) to work correctly.
 */
export function createSupabaseForUser(token: string | null) {
    if (!url) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
    }
    // Always use the publishable/anon key for RLS-scoped clients
    const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
        throw new Error("Supabase publishable key is not defined");
    }

    const options: any = {
        global: {
            headers: {},
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    };

    if (token) {
        options.global.headers.Authorization = `Bearer ${token}`;
    }

    return createClient(url, supabaseKey, options);
}
