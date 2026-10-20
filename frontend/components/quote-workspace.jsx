"use client"

import { useQuote } from "@/hooks/use-quote"
import { QuoteForm } from "@/components/quote-form"
import { QuoteSummary } from "@/components/quote-summary"

export function QuoteWorkspace() {
  const quote = useQuote()
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[1.2fr_1fr]">
      <QuoteForm {...quote} />
      <QuoteSummary result={quote.result} loading={quote.loading} />
    </div>
  )
}
