import { useEffect, useRef, useState } from 'react'
import { importHealthBase64 } from '../lib/healthImport'

export interface AutoImportResult {
  status: 'idle' | 'imported' | 'error'
  count: number
  message: string
}

export function useHealthAutoImport(): AutoImportResult {
  const ran = useRef(false)
  const [result, setResult] = useState<AutoImportResult>({ status: 'idle', count: 0, message: '' })

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const encoded = findHealthParam()
    if (!encoded) return

    importHealthBase64(encoded)
      .then((count) => {
        cleanUrl()
        setResult({ status: 'imported', count, message: `Imported ${count} health entries` })
      })
      .catch((err) => {
        setResult({ status: 'error', count: 0, message: String(err?.message ?? err) })
      })
  }, [])

  return result
}

function findHealthParam(): string | null {
  const search = new URLSearchParams(window.location.search)
  if (search.has('health')) return search.get('health')!

  const hash = window.location.hash
  const qIdx = hash.indexOf('?')
  if (qIdx !== -1) {
    const hashParams = new URLSearchParams(hash.slice(qIdx))
    if (hashParams.has('health')) return hashParams.get('health')!
  }

  return null
}

function cleanUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('health')
  const hash = url.hash
  const qIdx = hash.indexOf('?')
  if (qIdx !== -1) {
    const base = hash.slice(0, qIdx)
    const hashParams = new URLSearchParams(hash.slice(qIdx))
    hashParams.delete('health')
    const remaining = hashParams.toString()
    url.hash = remaining ? `${base}?${remaining}` : base
  }
  window.history.replaceState(null, '', url.toString())
}
