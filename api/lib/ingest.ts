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

const URL_TIMEOUT_MS  = parseInt(process.env.URL_TIMEOUT_MS  ?? '10000', 10)
const MIN_CONTENT_LEN = parseInt(process.env.MIN_CONTENT_LEN ?? '200',   10)

export async function extractFromUrl(url: string): Promise<string> {
  let res: Awaited<ReturnType<typeof fetch>>

  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Summarizer/1.0)' },
      timeout: URL_TIMEOUT_MS,
    })
  } catch (err) {
    throw new Error(
      `Could not reach "${url}". Check that the URL is correct and publicly accessible.`
    )
  }

  if (!res.ok) {
    throw new Error(
      `"${url}" returned ${res.status} ${res.statusText}. Make sure the link is publicly accessible.`
    )
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()

  if (text.length < MIN_CONTENT_LEN) {
    throw new Error(
      `Not enough readable content found at "${url}". The page may require a login, block bots, or be mostly JavaScript-rendered.`
    )
  }

  return text
}

export function extractFromText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Provided text is empty')
  return trimmed
}
