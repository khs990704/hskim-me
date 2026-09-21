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
import rehypeShiki from '@shikijs/rehype'
import { ObsidianFlavoredMarkdown } from '@quartz-community/obsidian-flavored-markdown'
import { CrawlLinks } from '@quartz-community/crawl-links'

// 문법 강조는 빌드 시점에 끝낸다.
// 브라우저에서 처리하면 해당 문서가 43개뿐인데도 모든 방문자가 하이라이터를 받는다.
//
// 다크·라이트 두 벌을 CSS 변수로 함께 내보내(defaultColor: false)
// 테마 전환 시 다시 계산하지 않고 색만 바뀌게 한다.
const SHIKI = {
  themes: { light: 'github-light', dark: 'github-dark-dimmed' },
  defaultColor: false,
  // Vault 에 실제로 쓰인 언어 + 앞으로 쓸 만한 것
  langs: [
    'sql', 'cpp', 'c', 'python', 'bash', 'typescript', 'javascript', 'tsx', 'jsx',
    'java', 'json', 'yaml', 'rust', 'go', 'html', 'css', 'markdown', 'diff', 'text',
  ],
  // 모르는 언어 때문에 빌드가 멈추지 않게 한다
  fallbackLanguage: 'text',
}

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
  proc = proc.use(rehypeShiki, SHIKI)
  proc = proc.use(rehypeStringify, { allowDangerousHtml: true })

  return { proc, textTransform: src => (ofm.textTransform ? ofm.textTransform(ctx, src) : src) }
}
