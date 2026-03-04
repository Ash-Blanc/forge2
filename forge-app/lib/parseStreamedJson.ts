// lib/parseStreamedJson.ts

/**
 * Parses incomplete JSON streams into partial objects.
 * This handles adding missing closing braces, brackets, and quotes.
 * Credit: inspired by partial-json implementations.
 */
export function parseStreamedJson(jsonStr: string): any {
    let cleanStr = jsonStr.trim();
    if (!cleanStr) return null;

    // Fast path: if it parses cleanly, just return it
    try {
        return JSON.parse(cleanStr);
    } catch (e) {
        // Continue with partial parsing
    }

    try {
        // Clean up unclosed string quotes at the very end
        if ((cleanStr.match(/"/g) || []).length % 2 !== 0) {
            cleanStr += '"';
        }

        // Count unclosed structures (brackets and braces) ignoring those inside strings
        let inString = false;
        let isEscaped = false;
        const stack: string[] = [];

        for (let i = 0; i < cleanStr.length; i++) {
            const char = cleanStr[i];

            if (isEscaped) {
                isEscaped = false;
                continue;
            }

            if (char === '\\') {
                isEscaped = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === '{') stack.push('}');
                else if (char === '[') stack.push(']');
                else if (char === '}' || char === ']') {
                    if (stack.length > 0 && stack[stack.length - 1] === char) {
                        stack.pop();
                    }
                }
            }
        }

        // Add trailing structures if any are unclosed
        while (stack.length > 0) {
            cleanStr += stack.pop();
        }

        // Sometimes the last character before our injected closures might be a trailing comma
        // which JSON.parse doesn't like.
        cleanStr = cleanStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

        return JSON.parse(cleanStr);
    } catch (err) {
        // If it still fails, just return null so the UI can decide what to do
        return null; // fallback
    }
}
