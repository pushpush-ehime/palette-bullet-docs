import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const templatePath = resolve(process.cwd(), '.github/page-templates/task.md')

declare const data: string
export { data }

export default {
  watch: [templatePath],
  load(): string {
    return readFileSync(templatePath, 'utf8').replaceAll('\r\n', '\n')
  }
}
