import React, { useState, useRef, useEffect, lazy, Suspense, type RefObject } from 'react'
import { useEmojiInsert } from '@/hooks/useEmojiInsert'

const LazyPicker = lazy(() => import('@emoji-mart/react'))
const emojiDataPromise = import('@emoji-mart/data').then((m) => m.default)

interface EmojiPickerInlineProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (newValue: string) => void
}

export function EmojiPickerInline({
  textareaRef,
  value,
  onChange,
}: EmojiPickerInlineProps) {
  const [open, setOpen] = useState(false)
  const [emojiData, setEmojiData] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { handleEmojiSelect } = useEmojiInsert({ textareaRef, value, onChange })

  const onSelect = (emoji: { native: string }) => {
    handleEmojiSelect(emoji)
    setOpen(false)
  }

  const handleOpen = async () => {
    if (!emojiData) {
      const data = await emojiDataPromise
      setEmojiData(data)
    }
    setOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const triggerStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    color: '#A1A1AA',
    fontSize: '16px',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
  }

  const pickerWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: '8px',
    zIndex: 9999,
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleOpen}
        style={triggerStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#A3E635')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#A1A1AA')}
        aria-label="Insert emoji"
      >
        &#x1F642;
      </button>
      {open && emojiData && (
        <div style={pickerWrapperStyle}>
          <Suspense
            fallback={
              <div
                style={{
                  width: '308px',
                  height: '320px',
                  backgroundColor: 'rgba(38, 38, 38, 0.85)',
                  borderRadius: '12px',
                }}
              />
            }
          >
            <LazyPicker
              data={emojiData}
              onEmojiSelect={onSelect}
              theme="dark"
              set="native"
              perLine={7}
              previewPosition="none"
              skinTonePosition="search"
              searchPosition="sticky"
              navPosition="top"
              maxFrequentRows={1}
              emojiSize={20}
              emojiButtonSize={28}
              emojiButtonRadius="4px"
              icons="outline"
              autoFocus
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
