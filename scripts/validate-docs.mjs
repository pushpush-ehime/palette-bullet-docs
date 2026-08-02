import {
  loadCatalog,
  validateCatalog
} from '../docs/.vitepress/content/catalog.mjs'

const catalog = loadCatalog({ includeUpdated: false })
const errors = validateCatalog(catalog)

if (errors.length > 0) {
  console.error('設計書の検査に失敗しました。')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`設計書の検査に合格しました（${catalog.length}ページ）。`)
}
