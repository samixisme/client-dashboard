"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  showTime?: boolean
  timeFormat?: '12h' | '24h'
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
  minDate,
  maxDate,
  showTime = true,
  timeFormat = '24h',
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [time, setTime] = React.useState<string>(
    value ? format(value, 'HH:mm') : '10:00'
  )

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setTime(format(value, 'HH:mm'))
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      // Combine date with current time
      const [hours, minutes] = time.split(':').map(Number)
      date.setHours(hours, minutes, 0, 0)
      onChange?.(date)
    } else {
      setSelectedDate(undefined)
      onChange?.(undefined)
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    if (selectedDate) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDate = new Date(selectedDate)
      newDate.setHours(hours, minutes, 0, 0)
      onChange?.(newDate)
    }
  }

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder

    if (showTime) {
      return `${format(selectedDate, 'PPP')} at ${format(selectedDate, timeFormat === '12h' ? 'h:mm a' : 'HH:mm')}`
    }
    return format(selectedDate, 'PPP')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            "bg-white/5 backdrop-blur-xl border-white/20",
            "hover:bg-white/8 hover:border-primary",
            "hover:shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]",
            "transition-all duration-300",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{formatDisplayValue()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="calendar-glass-popover w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) => {
            if (disabled) return true
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          initialFocus
        />
        {showTime && (
          <div className="border-t border-white/20 p-3">
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={disabled}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-white/5 backdrop-blur-xl border border-white/20",
                "text-foreground",
                "hover:border-primary/40",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "transition-all duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
