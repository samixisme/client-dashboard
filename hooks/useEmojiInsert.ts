import { useCallback, type RefObject } from 'react'

interface UseEmojiInsertOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (newValue: string) => void
}

interface UseEmojiInsertReturn {
  handleEmojiSelect: (emoji: { native: string }) => void
}

export function useEmojiInsert({
  textareaRef,
  value,
  onChange,
}: UseEmojiInsertOptions): UseEmojiInsertReturn {
  const handleEmojiSelect = useCallback(
    (emoji: { native: string }) => {
      const textarea = textareaRef.current
      if (!textarea) {
        onChange(value + emoji.native)
        return
      }

      const start = textarea.selectionStart ?? value.length
      const end = textarea.selectionEnd ?? value.length
      const newValue = value.slice(0, start) + emoji.native + value.slice(end)
      onChange(newValue)

      const newCursorPos = start + emoji.native.length
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      })
    },
    [textareaRef, value, onChange]
  )

  return { handleEmojiSelect }
}
