import { devtools } from 'zustand/middleware'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { derivable } from './middlewares'
import type { Command, Patch } from './types'
import { deepCopy, merge } from './utils'

export class Zeit<State extends object, DerivedState extends object> {
  constructor(initialState: State, compute: (state: State) => DerivedState) {
    this._initialState = initialState
    this._snapshot = deepCopy(initialState)
    this._store = createStore<State & DerivedState>()(
      devtools(derivable<State, DerivedState>(() => this._snapshot, compute)),
    )
    this._snapshot = this._state = this._store.getState()
  }

  private _initialState: State

  private _state: State

  private _snapshot: State

  private _store: StoreApi<State & DerivedState>

  private _cursor = -1

  private _stack: Command<State>[] = []

  private _applyPatch(patchState: Patch<State>, id?: string) {
    const prev = this._state
    const next = merge(this._state, patchState)
    const finale = this.commit(next, prev, patchState, id)

    this.onStateWillChange?.(finale, id)
    this._state = finale

    this._store.setState(this._state, true)
    this.onStateDidChange?.(this._state, id)
    return this
  }

  /**
   * 在正式更新状态之前执行最后的修改。
   *
   * 默认的实现是直接返回了 `merge(next, patchState)` 的结果，也就是没有做任何修
   * 改。在扩展 `Zeit` 类时重写这个方法来实现自定义的修改或者其他副作用（side
   * effects），比如说日志，调试等等。请注意，此方法内执行的修改是无法撤销的。
   */
  public commit(next: State, _prev: State, _patch: Patch<State>, _id?: string) {
    return next
  }

  public patch(patchState: Patch<State>) {
    this._applyPatch(patchState)
    this.onPatch?.(this._state)
    return this
  }

  public replace(state: State) {
    const finale = this.commit(state, this._state, state)

    this.onStateWillChange?.(finale)
    this._state = finale

    this._store.setState(this._state, true)
    this.onStateDidChange?.(this._state)
    return this
  }

  public replaceHistory(
    history: Command<State>[],
    cursor = history.length - 1,
  ) {
    this._stack = history
    this._cursor = cursor
    this.onReplaceHistory?.(this._state)
    return this
  }

  public reset() {
    this.onStateWillChange?.(this._snapshot, '__reset__')
    this._state = this._initialState

    this.resetHistory()
    this.onReset?.(this._state)

    this._store.setState(this._state, true)
    this.onStateDidChange?.(this._state, '__reset__')
    return this
  }

  public resetHistory() {
    this._stack = []
    this._cursor = -1
    this.onResetHistory?.(this._state)
    return this
  }

  public execute(command: Command<State>, id = command.id) {
    if (this._cursor < this._stack.length - 1) {
      this._stack = this._stack.slice(0, this._cursor + 1)
    }
    this._stack.push({ ...command, id })
    this._cursor = this._stack.length - 1

    this._applyPatch(command.next, id)
    this.onCommand?.(command, id)
    return this
  }

  public get store() {
    return this._store
  }

  public get state() {
    return this.store.getState()
  }

  public get snapshot() {
    return this._snapshot
  }

  public get history() {
    return this._stack
  }

  public get canUndo() {
    return this._cursor > -1
  }

  public get canRedo() {
    return this._cursor < this._stack.length - 1
  }

  public saveSnapshot() {
    this._snapshot = { ...this._state }
    return this
  }

  public forceUpdate() {
    this._store.setState(this._state, true)
  }

  public undo() {
    if (this.canUndo) {
      const command = this._stack[this._cursor]
      if (typeof command !== 'undefined') {
        this._cursor -= 1
        this._applyPatch(command.prev, '__undo__')
        this.onUndo?.(this._state)
      }
    }
    return this
  }

  public redo() {
    if (this.canRedo) {
      this._cursor += 1
      const command = this._stack[this._cursor]
      if (typeof command !== 'undefined') {
        this._applyPatch(command.next, '__redo__')
        this.onRedo?.(this._state)
      }
    }
    return this
  }

  public onStateWillChange?(state: State, id?: string): void

  public onStateDidChange?(state: State, id?: string): void

  public onPatch?: (state: State) => void

  public onCommand?: (command: Command<State>, id?: string) => void

  public onReset?: (state: State) => void

  public onResetHistory?: (state: State) => void

  public onReplaceHistory?: (state: State) => void

  public onUndo?: (state: State) => void

  public onRedo?: (state: State) => void
}
