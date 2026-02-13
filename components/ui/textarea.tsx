import * as React from "react"
import { lazy, Suspense, useState, useRef, useCallback } from "react"
import { Smile } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useEmojiInsert } from "@/hooks/useEmojiInsert"
import { cn } from "@/lib/utils"

const LazyPicker = lazy(() => import("@emoji-mart/react"))
const emojiDataPromise = import("@emoji-mart/data").then((m) => m.default)

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  emoji?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ emoji = true, className, value, onChange, ...props }, ref) => {
    const [open, setOpen] = useState(false)
    const [emojiData, setEmojiData] = useState<any>(null)
    const internalRef = useRef<HTMLTextAreaElement | null>(null)

    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
        }
      },
      [ref]
    )

    const strValue = typeof value === "string" ? value : String(value ?? "")

    const { handleEmojiSelect } = useEmojiInsert({
      textareaRef: internalRef,
      value: strValue,
      onChange: (newValue) => {
        if (onChange) {
          const syntheticEvent = {
            target: { value: newValue },
          } as React.ChangeEvent<HTMLTextAreaElement>
          onChange(syntheticEvent)
        }
      },
    })

    const onSelect = (emojiObj: { native: string }) => {
      handleEmojiSelect(emojiObj)
      setOpen(false)
    }

    const handleOpenPicker = async () => {
      if (!emojiData) {
        const data = await emojiDataPromise
        setEmojiData(data)
      }
      setOpen(true)
    }

    const textareaClasses = cn(
      "w-full text-sm rounded-lg bg-glass/40 backdrop-blur-sm border border-border-color text-text-primary focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none outline-none p-2 placeholder:text-text-secondary",
      className
    )

    if (!emoji) {
      return (
        <textarea
          ref={setRefs}
          data-slot="textarea"
          className={textareaClasses}
          value={value}
          onChange={onChange}
          {...props}
        />
      )
    }

    return (
      <div className="relative" data-slot="textarea-wrapper">
        <textarea
          ref={setRefs}
          data-slot="textarea"
          className={cn(textareaClasses, "pr-9")}
          value={value}
          onChange={onChange}
          {...props}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              aria-label="Insert emoji"
              className="absolute bottom-1.5 right-1.5 text-text-secondary hover:text-primary hover:bg-glass/40"
              onClick={handleOpenPicker}
            >
              <Smile className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-auto p-0 border-none bg-transparent shadow-none"
            sideOffset={8}
          >
            <Suspense
              fallback={
                <div className="w-[352px] h-[360px] animate-pulse bg-glass/40 rounded-xl" />
              }
            >
              {emojiData && (
                <LazyPicker
                  data={emojiData}
                  onEmojiSelect={onSelect}
                  theme="dark"
                  set="native"
                  perLine={8}
                  previewPosition="none"
                  skinTonePosition="search"
                  searchPosition="sticky"
                  navPosition="top"
                  maxFrequentRows={2}
                  emojiSize={22}
                  emojiButtonSize={32}
                  emojiButtonRadius="6px"
                  icons="outline"
                  autoFocus
                />
              )}
            </Suspense>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
