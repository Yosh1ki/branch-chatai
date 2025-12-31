import { RichTextRenderer } from "@/components/RichTextRenderer"
import { recommendationsDoc } from "@/lib/recommendations-data"

export default function RecommendationsPage() {
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

      <RichTextRenderer value={recommendationsDoc} />
    </div>
  )
}
