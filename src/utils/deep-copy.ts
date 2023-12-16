/* eslint-disable max-depth */
/**
 * 返回指定对象的深度拷贝，支持 Date、RegExp、Array、Set、Map 等类型。
 * @example
 * ```typescript
 * const output = deepCopy(input)
 * ```
 * @protected
 * @param {T} target 指定对象
 * @returns {T} 指定对象的深度拷贝
 */
export function deepCopy<T>(target: T): T {
  if (target === null) {
    return target
  }

  // support Date
  if (target instanceof Date) {
    return new Date(target.getTime()) as T
  }

  // support RegExp
  if (target instanceof RegExp) {
    return new RegExp(target) as T
  }

  if (typeof target === 'object') {
    if (typeof target[Symbol.iterator as keyof T] === 'function') {
      // support Array
      if (Array.isArray(target)) {
        const array = []
        if (target.length > 0) {
          for (const member of target) {
            array.push(deepCopy(member))
          }
        }
        return array as T
      }

      // support Set
      if (target instanceof Set) {
        const set = new Set()
        for (const member of target) {
          set.add(deepCopy(member))
        }
        return set as T
      }

      // support Map
      if (target instanceof Map) {
        const map = new Map()
        for (const [key, value] of target) {
          map.set(key, deepCopy(value))
        }
        return map as T
      }
    } else {
      const targetKeys = Object.keys(target) as (keyof T)[]
      const object = {} as T
      if (targetKeys.length > 0) {
        for (const key of targetKeys) {
          object[key] = deepCopy(target[key])
        }
      }
      return object
    }
  }

  return target
}
