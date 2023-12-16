/**
 * @protected
 */
export type RecursivePartial<T> = Partial<{
  [P in keyof T]: RecursivePartial<T[P]>
}>

/**
 * 状态补丁
 */
export type Patch<T> = RecursivePartial<T>

/**
 * 命令
 */
export interface Command<T extends object> {
  id?: string
  prev: Patch<T>
  next: Patch<T>
}
