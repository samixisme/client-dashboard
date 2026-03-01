export function extractMentions(text: string): string[] {
    const matches = text.match(/@(\w+)/g) ?? [];
    return matches.map(m => m.slice(1));
}
