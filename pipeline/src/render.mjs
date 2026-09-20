// unified 파이프라인 구성.
// Obsidian 고유 문법은 Quartz 플러그인에 맡기고, 표준 마크다운·수식은 일반 remark/rehype 를 쓴다.
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import { ObsidianFlavoredMarkdown } from '@quartz-community/obsidian-flavored-markdown'
import { CrawlLinks } from '@quartz-community/crawl-links'

export function makeProcessor(ctx) {
  const ofm = ObsidianFlavoredMarkdown({
    comments: true,        // %% 주석 제거
    highlight: true,       // ==하이라이트==
    wikilinks: true,       // [[링크]], [[링크|별칭]], ![[임베드]]
    callouts: true,        // > [!note]
    mermaid: true,
    parseTags: true,       // #태그
    parseBlockReferences: true,
    enableCheckbox: true,
  })
  const crawl = CrawlLinks({ markdownLinkResolution: 'shortest', prettyLinks: true })

  let proc = unified().use(remarkParse)
  for (const p of [ofm]) if (p.markdownPlugins) proc = proc.use(p.markdownPlugins(ctx))
  proc = proc.use(remarkGfm).use(remarkMath)
  proc = proc.use(remarkRehype, { allowDangerousHtml: true })
  proc = proc.use(rehypeSlug)
  for (const p of [ofm, crawl]) if (p.htmlPlugins) proc = proc.use(p.htmlPlugins(ctx))
  proc = proc.use(rehypeKatex, { throwOnError: false, strict: false })
  proc = proc.use(rehypeStringify, { allowDangerousHtml: true })

  return { proc, textTransform: src => (ofm.textTransform ? ofm.textTransform(ctx, src) : src) }
}
