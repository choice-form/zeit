import type { Patch } from '~/types'

/**
 * 深度合并两个对象，支持 Date、RegExp、Map、Set、DOMRect、DOMRectReadOnly 等类
 * 型，上述类型在合并时会直接返回自身。
 * @example
 * ```typescript
 * const output = merge(input, patch)
 * ```
 * @protected
 * @param {T} target
 * @param {Patch<T>} patch
 * @returns {T} target 和 patch 深度合并后的新对象
 */
export function merge<T>(target: T, patch: Patch<T>): T {
  if (
    patch instanceof Date ||
    patch instanceof RegExp ||
    patch instanceof Map ||
    patch instanceof Set ||
    patch instanceof DOMRect ||
    patch instanceof DOMRectReadOnly
  ) {
    return patch as T
  }

  const finale = { ...target }

  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    finale[key] =
      value === Object(value) && !Array.isArray(value)
        ? merge(finale[key], value)
        : value
  }

  return finale
}
