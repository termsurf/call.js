export type BindCallCast = (call: any, link: any) => any

export type BindCast = Record<string, BindCallCast>

export type BindMeshCast = Record<string, BindCast>
