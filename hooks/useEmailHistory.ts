import { useState, useCallback } from 'react'

interface UseEmailHistoryReturn<T> {
  document: T
  setDocument: (doc: T, skipHistory?: boolean) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  reset: (doc: T) => void
}

const MAX_HISTORY_SIZE = 50

export function useEmailHistory<T>(initialDocument: T): UseEmailHistoryReturn<T> {
  const [document, setDocumentState] = useState<T>(initialDocument)
  const [history, setHistory] = useState<T[]>([JSON.parse(JSON.stringify(initialDocument))])
  const [historyIndex, setHistoryIndex] = useState(0)

  const setDocument = useCallback((newDoc: T, skipHistory = false) => {
    setDocumentState(newDoc)

    if (!skipHistory) {
      setHistory(prev => {
        const trimmed = prev.slice(0, historyIndex + 1)
        const next = [...trimmed, JSON.parse(JSON.stringify(newDoc))]
        if (next.length > MAX_HISTORY_SIZE) next.shift()
        return next
      })
      setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1))
    }
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setDocumentState(JSON.parse(JSON.stringify(history[newIndex])))
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setDocumentState(JSON.parse(JSON.stringify(history[newIndex])))
    }
  }, [historyIndex, history])

  const reset = useCallback((doc: T) => {
    const snapshot = JSON.parse(JSON.stringify(doc))
    setHistory([snapshot])
    setHistoryIndex(0)
    setDocumentState(snapshot)
  }, [])

  return {
    document,
    setDocument,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    reset,
  }
}
