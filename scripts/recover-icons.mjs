import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const source = process.argv[2]
if (!source)
  throw new Error("Usage: node scripts/recover-icons.mjs <compiled-about.css>")

const root = resolve(import.meta.dirname, "..")
const targetRoot = resolve(root, "public", "icons")
const css = readFileSync(source, "utf8")

mkdirSync(targetRoot, { recursive: true })

for (const name of ["arxiv", "doi", "hust", "xposed"]) {
  const selector = `.i-custom-${name}`
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`Missing ${selector}`)

  const rule = css.slice(start, css.indexOf("}", start) + 1)
  const match = rule.match(
    /url\(["']data:image\/svg\+xml;utf8,([\s\S]*?)["']\)/,
  )
  if (!match) throw new Error(`Missing SVG payload for ${selector}`)

  const recovered = decodeURIComponent(match[1])
  if (!recovered.trimStart().startsWith("<svg"))
    throw new Error(`Invalid SVG for ${selector}`)

  const svg = recovered.replace(/<svg([^>]*)>/, (_root, attributes) => {
    let normalized = attributes.replace(/='([^']*)'/g, '="$1"')
    if (!/\bviewBox=/.test(normalized)) {
      const width = normalized.match(/\bwidth="([\d.]+)(?:px)?"/)?.[1]
      const height = normalized.match(/\bheight="([\d.]+)(?:px)?"/)?.[1]
      if (!width || !height)
        throw new Error(`Cannot derive viewBox for ${selector}`)
      normalized += ` viewBox="0 0 ${width} ${height}"`
    }
    return `<svg${normalized}>`
  })

  const target = resolve(targetRoot, `${name}.svg`)
  if (dirname(target) !== targetRoot) throw new Error("Unsafe icon target")
  writeFileSync(target, `${svg.trim()}\n`)
  console.log(`Recovered ${name}.svg`)
}
