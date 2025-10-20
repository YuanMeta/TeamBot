import { remark } from 'remark'
import remarkBreaks from 'remark-breaks'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkHtml from 'remark-html'

export async function markdownToPureHtml(markdown: string) {
  const result = await remark()
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkMath)
    .use(remarkHtml, { sanitize: false })
    .process(markdown)
  return String(result)
}
