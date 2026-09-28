// HTML 표준에 맞추는 정리 (W3C 검사, KWCAG 4.1.1)
//
// 1) Quartz 가 mermaid 코드블록에 끼워 넣는 자체 UI 를 걷어 낸다.
//
//   <pre><button class="expand-button">…</button>
//        <code class="mermaid">…</code>
//        <div id="mermaid-container" role="dialog">…</div></pre>
//
// 사이트는 도표 UI 를 직접 그린다 (web/components/Diagrams.tsx). 남겨 두면
//   - <pre> 안에 <div> 가 들어가 HTML 문법 오류가 된다 (W3C 검사, KWCAG 4.1.1)
//   - 도표가 둘 이상인 문서에서 id="mermaid-container" 가 겹친다
//   - 스크립트가 돌기 전에는 화면 읽기 프로그램에 빈 '대화상자' 가 잡힌다
// <code class="mermaid"> 만 남긴다.
import { visit } from 'unist-util-visit'

const isMermaidCode = n =>
  n.type === 'element' && n.tagName === 'code' &&
  [].concat(n.properties?.className ?? []).includes('mermaid')

export default function mermaidClean() {
  return tree => {
    visit(tree, 'element', node => {
      if (node.tagName !== 'pre') return
      const code = node.children.find(isMermaidCode)
      if (code) node.children = [code]
    })
  }
}

/**
 * 표 칸의 align 속성을 style 로 옮긴다.
 *
 * 마크다운 표의 정렬 표시(---:)를 remark-rehype 가 <td align="right"> 로 내보낸다.
 * align 은 HTML5 에서 폐기된 속성이라 W3C 검사에 경고로 잡힌다. 보이는 모양은 같다.
 */
export function tableAlign() {
  return tree => {
    visit(tree, 'element', node => {
      if (node.tagName !== 'td' && node.tagName !== 'th') return
      const a = node.properties?.align
      if (!a) return
      delete node.properties.align
      node.properties.style = `text-align:${a}` + (node.properties.style ? `;${node.properties.style}` : '')
    })
  }
}
