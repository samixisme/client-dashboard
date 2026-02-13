type RadioGroupInputProps = {
  label: string
  defaultValue: string
  onChange: (value: string) => void
  children: React.ReactNode
}

type OptionProps = {
  value: string
  children: React.ReactNode
  selected?: boolean
  onClick?: () => void
}

function Option({ children, selected, onClick }: OptionProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-1.5 text-xs text-center transition-all duration-300 cursor-pointer ${
        selected
          ? 'bg-primary text-background font-medium shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]'
          : 'text-text-secondary hover:text-text-primary hover:bg-glass-light/60'
      }`}
    >
      {children}
    </button>
  )
}

export default function RadioGroupInput({ label, defaultValue, onChange, children }: RadioGroupInputProps) {
  const options = Array.isArray(children) ? children : [children]

  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
        {options.map((child) => {
          if (!child || typeof child !== 'object' || !('props' in child)) return null
          const optionValue = (child as { props: { value: string } }).props.value
          return (
            <Option
              key={optionValue}
              value={optionValue}
              selected={defaultValue === optionValue}
              onClick={() => onChange(optionValue)}
            >
              {(child as { props: { children: React.ReactNode } }).props.children}
            </Option>
          )
        })}
      </div>
    </div>
  )
}

export function ToggleButton({ value, children }: { value: string; children: React.ReactNode }) {
  return <>{children}</>
}
