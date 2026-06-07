import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

// pdf-parse has no type declarations; require with explicit cast
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export async function extractFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  const text = data.text.trim()
  if (!text) throw new Error('PDF extraction returned empty content')
  return text
}

export async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Summarizer/1.0)' },
  })
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.statusText}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()
  if (!text) throw new Error('URL extraction returned empty content')
  return text
}

export function extractFromText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Provided text is empty')
  return trimmed
}
