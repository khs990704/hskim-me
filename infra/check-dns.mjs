// hskim.me 의 현재 DNS 레코드를 확인한다.
// 네임서버 이전 전후로 돌려 메일 레코드가 유지되는지 검증하는 용도다.
//
//   node infra/check-dns.mjs
const DOMAIN = 'hskim.me'

const QUERIES = [
  ['NS',    DOMAIN,          '네임서버'],
  ['MX',    DOMAIN,          '메일 수신 — 없어지면 메일이 끊긴다'],
  ['TXT',   DOMAIN,          'SPF·도메인 인증'],
  ['A',     DOMAIN,          '웹'],
  ['CNAME', `www.${DOMAIN}`, 'www'],
  ['A',     `www.${DOMAIN}`, 'www'],
  ['TXT',   `_dmarc.${DOMAIN}`, 'DMARC (선택)'],
]

const ask = async (name, type) => {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`,
    { headers: { accept: 'application/dns-json' } })
  const j = await r.json()
  return (j.Answer ?? []).map(a => a.data)
}

let mx = 0, spf = false
console.log(`\n  ${DOMAIN} DNS 조회\n`)
for (const [type, name, note] of QUERIES) {
  const ans = await ask(name, type)
  if (type === 'MX' && name === DOMAIN) mx = ans.length
  if (type === 'TXT' && ans.some(a => a.includes('v=spf1'))) spf = true
  const head = `  ${type.padEnd(5)} ${name.padEnd(18)}`
  if (!ans.length) { console.log(`${head} (없음)   ${note}`); continue }
  console.log(`${head} ${ans[0].length > 70 ? ans[0].slice(0, 67) + '…' : ans[0]}   ${note}`)
  for (const extra of ans.slice(1)) {
    console.log(`  ${''.padEnd(24)} ${extra.length > 70 ? extra.slice(0, 67) + '…' : extra}`)
  }
}

console.log('\n  --- 메일 점검 ---')
console.log(`  MX 레코드 ${mx}개  ${mx >= 1 ? '정상' : '⚠ 없음 — 메일 수신 불가'}`)
console.log(`  SPF       ${spf ? '정상' : '⚠ 없음 — 발신이 스팸 처리될 수 있음'}\n`)
if (mx < 1 || !spf) process.exitCode = 1
