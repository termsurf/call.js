import { BaseCast } from '~/code/form/base'
import { FormLinkBaseCast, FormLinkCast } from '~/code/form/form'

export function handleProperty({
  name,
  base,
  link,
}: {
  base: BaseCast
  name: string
  link: FormLinkCast
}) {
  const list: Array<string> = []
  const need = link.need ? '?' : ''
  const listPrefix = link.list ? `Array<` : ''
  const listSuffix = link.list ? `>` : ''

  function push(expression: string) {
    list.push(`${name}${need}: ${listPrefix}${expression}${listSuffix}`)
  }

  switch (link.like) {
    case 'timestamp':
      push(`Date`)
      break
    case 'text':
    case 'uuid':
      push(`string`)
      break
    case 'integer':
    case 'decimal':
      push(`number`)
      break
    case 'boolean':
      push(`boolean`)
      break
    case 'json':
      push(`object`)
      break
    case 'object':
      list.push(`${name}${need}: ${listPrefix}{`)
      handleEachProperty({ base, form: link }).forEach(line => {
        list.push(`  ${line}`)
      })
      list.push(`}${listSuffix}`)
      break
    default:
      list.push(`${name}${need}: ${listPrefix}{`)
      handleEachProperty({ base, form: link }).forEach(line => {
        list.push(`  ${line}`)
      })
      list.push(`}${listSuffix}`)
      break
  }

  return list
}

export function handleEachProperty({
  base,
  form,
}: {
  base: BaseCast
  form: FormLinkBaseCast
}) {
  const list: Array<string> = []
  for (const name in form.link) {
    const link = form.link[name]

    handleProperty({ base, name, link }).forEach(line => {
      list.push(`${line}`)
    })
  }
  return list
}