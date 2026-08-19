export const SITE = {
  title: "yllhwa",
  description: "yllhwa 的个人博客，记录技术、网络安全、开源与生活。",
  locale: "zh-CN",
  dir: "ltr",
} as const

export const NAVIGATION = [
  { href: "/", label: "文章" },
  { href: "/project/", label: "项目" },
  { href: "/friends/", label: "友链" },
  { href: "/about/", label: "关于" },
]

export const SOCIALS = [
  { href: "https://github.com/yllhwa", label: "GitHub", icon: "lucide:github" },
  { href: "/rss.xml", label: "RSS", icon: "lucide:rss" },
] as const
