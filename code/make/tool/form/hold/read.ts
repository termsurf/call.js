import { BaseCast } from '~/code/form/base'
import { ReadHoldCast, ReadHoldBondCast } from '~/code/form/hold/read'
import { FormLinkBaseCast, FormLinkCast } from '~/code/form/form'
import { hookSeek } from './move'
import { toPascalCase } from '~/code/tool'

export function hookContainer({
  base,
  form,
  read,
  isList = false,
  rise,
  line = [],
}: {
  line: Array<string>
  base: BaseCast
  form: FormLinkBaseCast
  read: ReadHoldCast
  isList?: boolean
  rise: Array<string>
}) {
  const list: Array<string> = []
  list.push(`| {`)

  if (isList) {
    list.push(`  total?: boolean`)
    list.push(`  randomize?: boolean`)
    list.push(`  single?: boolean`)

    if ('seek' in read && read.seek) {
      hookSeek({
        base,
        seek: read.seek,
        need: true,
      }).forEach(line => {
        list.push(`  ${line}`)
      })
    }
  }

  if (read.read) {
    list.push(`  read?: {`)

    hookEachProperty({
      base,
      form,
      read: read.read,
      rise,
      line,
    }).forEach(line => {
      list.push(`    ${line}`)
    })

    list.push(`  }`)
  }

  list.push(`}`)

  const nameName = line.map(toPascalCase).join('_')
  const nameList: Array<string> = [``]
  nameList.push(`export type ${nameName}ExtendType =`)
  list.forEach(line => {
    nameList.push(`  ${line}`)
  })

  rise.push(...nameList)

  list.length = 0

  list.push(`| ${nameName}ExtendType`)
  list.push(`| {`)
  list.push(`    name: Record<string, ${nameName}ExtendType>`)
  list.push(`  }`)

  return list
}

export function hookEachProperty({
  base,
  form,
  read,
  rise,
  line,
}: {
  base: BaseCast
  form: FormLinkBaseCast
  read: ReadHoldCast
  rise: Array<string>
  line: Array<string>
}) {
  const list: Array<string> = []

  for (const name in read) {
    const value = read[name]
    const link = form.link?.[name]
    if (!link) {
      // throw new Error(`${name}`)
      continue
    }

    hookProperty({
      name,
      base,
      link,
      value,
      line,
      rise,
    }).forEach(line => {
      list.push(line)
    })
  }
  return list
}

export function hookProperty({
  name,
  base,
  link,
  value,
  line,
  rise,
}: {
  name: string
  base: BaseCast
  link: FormLinkCast
  value: ReadHoldBondCast
  line: Array<string>
  rise: Array<string>
}) {
  const list: Array<string> = []

  const need = '?'
  switch (link.like) {
    case 'timestamp':
    case 'text':
    case 'uuid':
    case 'integer':
    case 'decimal':
    case 'json':
    case 'boolean':
      list.push(`${name}${need}: boolean`)
      break
    case 'object':
      if (typeof value === 'object') {
        list.push(`${name}${need}:`)
        hookContainer({
          base,
          form: link,
          isList: false,
          read: value,
          rise,
          line: line.concat([name]),
        }).forEach(line => {
          list.push(`  ${line}`)
        })
      }
      break
    case 'record': {
      if (typeof value === 'object' && value.case) {
        list.push(`${name}${need}:`)
        for (const name in value.case) {
          const container = value.case[name]
          const childSchema = base[name]
          hookContainer({
            base,
            form: childSchema,
            isList: !!link.list,
            read: container,
            rise,
            line: line.concat([name]),
          }).forEach(line => {
            list.push(`  ${line}`)
          })
        }
      }
      break
    }
    default: {
      if (typeof value === 'object') {
        const childSchema = base[link.like]
        list.push(`${name}${need}:`)
        hookContainer({
          base,
          form: childSchema,
          isList: !!link.list,
          read: value,
          rise,
          line: line.concat([name]),
        }).forEach(line => {
          list.push(`  ${line}`)
        })
      }
    }
  }

  return list
}
