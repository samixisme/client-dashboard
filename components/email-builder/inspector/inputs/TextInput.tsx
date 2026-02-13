import { useState } from 'react'
import { Textarea } from '../../../ui/textarea'

type TextInputProps = {
  label: string
  defaultValue: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
  type?: string
}

export default function TextInput({ label, defaultValue, onChange, multiline, rows = 3, placeholder, type = 'text' }: TextInputProps) {
  const [value, setValue] = useState(defaultValue)
  const inputClass = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

  const handleChange = (newValue: string) => {
    setValue(newValue)
    onChange(newValue)
  }

  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      {multiline ? (
        <Textarea
          emoji={false}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={`${inputClass}`}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}
