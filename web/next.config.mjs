import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
export default {
  // 모든 노트를 정적 HTML 로 뽑는다 (D-09 검색 노출의 전제)
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: false,
  // 저장소 안에 package.json 이 여러 개(web, pipeline)라 루트를 명시한다
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
}
