// 문단 안의 한 번 줄바꿈을 어떻게 보여줄지 정한다.
//
// Obsidian 은 기본 설정(엄격한 줄바꿈 꺼짐)에서 한 번의 줄바꿈도 줄바꿈으로 보여준다.
// 표준 마크다운은 한 문단으로 이어 붙이므로, 노트 상단의
//   기간: 2026.05 ~
//   관련 기술: …
// 가 한 줄로 붙어 보였다.
//
// 그렇다고 전부 줄바꿈으로 바꾸면 안 된다. 오픈소스 노트는 문장을 80자마다 끊어
// 써서, 웹에서 문장 중간마다 줄이 바뀌고 좁은 화면에서는 한 번 더 접힌다.
// 그래서 줄 끝을 보고 가른다.
//
//   라벨 줄(앞이나 뒤가 '라벨: 값')   → 줄바꿈      123 문단
//   앞줄이 문장으로 끝남              → 줄바꿈       83 문단
//   앞줄이 문장 중간에서 끊김          → 띄어쓰기    246 문단
import { visit } from 'unist-util-visit'

/** '기간: …', '관련 기술: …' 처럼 짧은 말머리 + 콜론으로 시작하는 줄 */
const LABEL = /^[^\s:：][^:：]{0,24}[:：]\s*\S/
/** 문장·구절이 끝난 줄. 한국어 종결 어미와 문장부호, 닫는 괄호, 강조 끝 */
const ENDS = /([.!?。…]|[다요음함임]|[)\]」』]|[:：—]|\*\*)\s*$/

const plain = node =>
  node.type === 'text' || node.type === 'inlineCode' ? node.value
  : node.type === 'break' ? '\n'
  : (node.children ?? []).map(plain).join('')

export default function lineBreaks() {
  return tree => {
    visit(tree, 'paragraph', para => {
      const full = plain(para)
      if (!full.includes('\n')) return

      // 줄바꿈마다 앞줄·뒷줄을 보고 결정을 미리 정해 둔다
      const lines = full.split('\n')
      const decide = lines.slice(0, -1).map((a, i) => {
        const b = lines[i + 1].trim()
        a = a.trim()
        return LABEL.test(a) || LABEL.test(b) || ENDS.test(a)
      })

      // 같은 순서로 문단의 글자 노드를 돌며 i 번째 줄바꿈에 결정을 적용한다
      let i = 0
      const walk = node => {
        if (!node.children) return
        const out = []
        for (const child of node.children) {
          if (child.type !== 'text' || !child.value.includes('\n')) {
            walk(child); out.push(child); continue
          }
          const parts = child.value.split('\n')
          parts.forEach((part, k) => {
            if (k > 0) {
              if (decide[i++]) out.push({ type: 'break' })
              else part = ' ' + part.replace(/^\s+/, '')
            }
            if (part) out.push({ type: 'text', value: part })
          })
        }
        node.children = out
      }
      walk(para)
    })
  }
}
