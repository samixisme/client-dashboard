// ─── Tag Color Palette ────────────────────────────────────────────────────────
// Predefined tag colors with Tailwind class mappings for glassmorphism UI

export interface TagColor {
  id: string;
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string; // solid color for small dots / indicators
}

export const TAG_COLORS: TagColor[] = [
  { id: 'red',     label: 'Red',     bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-500' },
  { id: 'orange',  label: 'Orange',  bg: 'bg-orange-500/20',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-500' },
  { id: 'amber',   label: 'Amber',   bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-500' },
  { id: 'green',   label: 'Green',   bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  { id: 'teal',    label: 'Teal',    bg: 'bg-teal-500/20',    text: 'text-teal-400',    border: 'border-teal-500/30',    dot: 'bg-teal-500' },
  { id: 'cyan',    label: 'Cyan',    bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-500' },
  { id: 'blue',    label: 'Blue',    bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-500' },
  { id: 'indigo',  label: 'Indigo',  bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  border: 'border-indigo-500/30',  dot: 'bg-indigo-500' },
  { id: 'violet',  label: 'Violet',  bg: 'bg-violet-500/20',  text: 'text-violet-400',  border: 'border-violet-500/30',  dot: 'bg-violet-500' },
  { id: 'pink',    label: 'Pink',    bg: 'bg-pink-500/20',    text: 'text-pink-400',    border: 'border-pink-500/30',    dot: 'bg-pink-500' },
  { id: 'rose',    label: 'Rose',    bg: 'bg-rose-500/20',    text: 'text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-500' },
  { id: 'gray',    label: 'Gray',    bg: 'bg-gray-500/20',    text: 'text-gray-400',    border: 'border-gray-500/30',    dot: 'bg-gray-500' },
];

const colorMap = new Map(TAG_COLORS.map((c) => [c.id, c]));

/**
 * Get Tailwind classes for a tag color.
 * Falls back to the first color (red) if colorId is unknown.
 */
export function getTagColorClasses(colorId?: string): TagColor {
  if (!colorId) return TAG_COLORS[0];
  return colorMap.get(colorId) ?? TAG_COLORS[0];
}

/** Get the default color (first in the palette). */
export function getDefaultColor(): TagColor {
  return TAG_COLORS[0];
}
