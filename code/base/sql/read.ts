import _ from 'lodash'
import { ComparisonOperatorExpression } from 'kysely'
import { FormLinkBaseCast, ReadCallCast } from '../../cast'
import { Robe } from './robe'
import { moveHaveFormToSite } from './form'

export function moveReadToHaveForm(
  robe: Robe,
  name: string,
  read: ReadCallCast,
) {
  const form = robe.base[name]

  return moveReadObject(form, read)
}

function moveReadObject(
  form: FormLinkBaseCast,
  read: ReadCallCast,
  path: Array<string> = [],
  self: Array<string> = [],
  nest: Record<string, ReadCallCast> = {},
): [Array<string>, Record<string, ReadCallCast>] {
  for (const name in read) {
    const bond = read[name]

    if (bond === true) {
      self.push(path.concat([name]).join('__'))
    } else if (typeof bond === 'object') {
      const link = form.link?.[name]
      if (link) {
        switch (link.like) {
          case 'object':
            if (bond.read) {
              moveReadObject(
                link,
                bond.read,
                path.concat([name]),
                self,
                nest,
              )
            }
            break
          case 'site':
            console.log(`TODO: 'site' type`)
            break
          default:
            // nest[name] = bond
            break
        }
      }
    }
  }

  return [self, nest]
}

export async function callAndReadRecord({
  robe,
  name,
  test,
  read,
}: {
  robe: Robe
  name: string
  test: Array<[string, ComparisonOperatorExpression, any]>
  read: ReadCallCast
}) {
  const form = robe.base[name]
  if (!form.hook) {
    throw new Error('Missing hook')
  }
  const hook = form.hook.join('__')
  let call = robe.hold.selectFrom(name).select([hook])

  test.forEach(c => {
    call = call.where(c[0], c[1], c[2])
  })

  const basicRecord = await call.executeTakeFirstOrThrow()

  const site = await readRecord({
    robe,
    name,
    hook: basicRecord[hook],
    read: read,
  })

  return site
}

export async function callAndReadCollection({
  robe,
  name,
  test,
  read,
}: {
  robe: Robe
  name: string
  test: Array<[string, ComparisonOperatorExpression, any]>
  read: ReadCallCast
}) {
  const form = robe.base[name]
  if (!form.hook) {
    throw new Error('Missing hook')
  }
  const hook = form.hook.join('__')

  let call = robe.hold.selectFrom(name).select([hook])

  test.forEach(c => {
    call = call.where(c[0], c[1], c[2])
  })

  const list = await call.execute()

  const { total } = await robe.hold
    .selectFrom(name)
    .select(robe.hold.fn.count<number>(hook).as('total'))
    .executeTakeFirstOrThrow()

  const site = await readCollection({
    robe,
    name,
    hook: list.map(x => x[hook]),
    read: read,
  })

  return { total, site }
}

export async function readCollection({
  robe,
  name,
  hook,
  read,
}: {
  robe: Robe
  name: string
  hook: Array<string>
  read: ReadCallCast
}) {
  const form = robe.base[name]

  if (!form.hook) {
    throw new Error('Missing hook')
  }
  const formHook = form.hook.join('__')

  const [self, nest] = moveReadToHaveForm(robe, name, read)

  let list: Array<object> = []

  if (self.length) {
    const tableMapList = await robe.hold
      .selectFrom(name)
      .where(formHook, 'in', hook)
      .select(self)
      .execute()

    const siteMapList = tableMapList.map(tableMap =>
      moveHaveFormToSite(tableMap),
    )

    list = siteMapList
  } else {
    list = hook.map(bond => ({ [formHook]: bond }))
  }

  for (const name in nest) {
    const link = form.link[name]

    if (link) {
      const nestRead = nest[name]
      if (link.list) {
        // const nestRecordList = robe.model[name].read({
        //   filter: {
        //     [link.self]: {
        //       id,
        //     },
        //   },
        //   read: nestRead,
        // })
      } else {
        // const nestRecord = robe.model[name].read(id, nestRead)
      }
    }
  }

  return list
}

export async function readRecord({
  name,
  hook,
  read,
  robe,
}: {
  robe: Robe
  name: string
  hook: string
  read: ReadCallCast
}) {
  const form = robe.base[name]

  if (!form.hook) {
    throw new Error('Missing hook')
  }
  const formHook = form.hook.join('__')

  const [self, nest] = moveReadToHaveForm(robe, name, read)

  const site: Record<string, any> = {}

  if (self.length) {
    const tableMap = await robe.hold
      .selectFrom(name)
      .where(formHook, '=', hook)
      .select(self)
      .executeTakeFirstOrThrow()

    const siteMap = moveHaveFormToSite(tableMap)

    _.merge(site, siteMap)
  } else {
    site[formHook] = hook
  }

  for (const name in nest) {
    const link = form.link[name]

    if (link) {
      const nestRead = nest[name]
      if (link.list) {
        // const nestRecordList = robe.model[name].expandGather({
        //   filter: {
        //     [link.self]: {
        //       id,
        //     },
        //   },
        //   read: nestRead,
        // })
      } else {
        // const nestRecord = robe.model[name].expandSelect(
        //   id,
        //   nestRead,
        // )
      }
    }
  }
}
