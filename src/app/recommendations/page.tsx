"use client"

import { useEffect, useState } from "react"
import { RichTextOutput } from "@/components/RichTextOutput"

type RecommendationResponse = {
  content: unknown
}

export default function RecommendationsPage() {
  const [content, setContent] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        const res = await fetch("/api/recommendations")
        if (!res.ok) {
          throw new Error(`Failed to fetch recommendations (${res.status})`)
        }
        const data = (await res.json()) as RecommendationResponse
        if (isMounted) {
          setContent(data.content)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Recommendations
        </h1>
        <p className="text-sm text-muted-foreground">
          Rich text response rendering demo.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <RichTextOutput value={content} />
      )}
    </div>
  )
}
