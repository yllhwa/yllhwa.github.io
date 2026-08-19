import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"
import icon from "astro-icon"
import { satteri } from "@astrojs/markdown-satteri"
import {
  blockExpressiveCode,
  inlineExpressiveCode,
} from "./src/lib/expressive-code"
import { temmlMath } from "./src/lib/math"
import { calloutDirective } from "./src/lib/callout"
import { externalLinks } from "./src/lib/external-links"
import { headingNamespace } from "./src/lib/heading-namespace"
import { headingAnchors } from "./src/lib/heading-anchors"

export default defineConfig({
  site: "https://blog.yllhwa.com",
  compressHTML: true,
  prefetch: { prefetchAll: true },
  integrations: [
    icon({
      include: {
        lucide: ["arrow-up", "github", "moon", "rss", "sun"],
        logos: [
          "go",
          "python",
          "java",
          "redis",
          "postgresql",
          "nginx",
          "docker-icon",
          "typescript-icon",
          "javascript",
          "dart",
          "vue",
          "vitejs",
          "unocss",
          "tauri",
          "flutter",
          "microsoft-windows-icon",
          "visual-studio-code",
          "git-icon",
          "github-icon",
          "steam",
        ],
        octicon: ["repo-16", "star-16", "repo-forked-16", "link-external-16"],
      },
    }),
    sitemap(),
  ],
  markdown: {
    syntaxHighlight: false,
    processor: satteri({
      features: { directive: true, math: true },
      mdastPlugins: [calloutDirective, inlineExpressiveCode, temmlMath],
      hastPlugins: [
        externalLinks,
        blockExpressiveCode,
        headingNamespace,
        headingAnchors,
      ],
    }),
  },
})
