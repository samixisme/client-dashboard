type ColorInputProps = {
  label: string
  defaultValue: string
  onChange: (value: string) => void
}

export default function ColorInput({ label, defaultValue, onChange }: ColorInputProps) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={defaultValue || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 bg-glass-light/40 border border-border-color/50 rounded-xl cursor-pointer hover:border-border-color/80 transition-all duration-300"
        />
        <input
          type="text"
          value={defaultValue || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"
        />
      </div>
    </div>
  )
}
