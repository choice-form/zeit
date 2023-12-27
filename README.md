# @choiceform/zeit

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 介绍

Zeit 是基于 Zustand（但不与特定框架绑定，例如：React）实现了历史记录功能的状态管理器，通过命令模式（Command Pattern）可以方便的实现 Undo/Redo 功能。同时，Zeit 还提供了一个内置的衍生状态中间件（Derived State Middleware）。无论是 Zeit 还是它的中间件都支持 `Date`，`RegExp`，`Array`，`Set`，`Map`等复合类型，为使用者省去了序列化/反序列化的繁琐过程。

## 用法

通过扩展 `Zeit` 来定义业务逻辑，`execute` 方法接收一个 `Command` 对象来实现具备 Undo/Redo 功能的状态变更。其中 `next` 代表变更后的状态，而 `prev` 则是撤销之后还原的状态。

```ts
import { Zeit } from '@choiceform/zeit'

class Store extends Zeit {
  increase(amount: number) {
    this.execute({
      prev: {
        count: this.state.count,
      }
      next: {
        count: this.state.count + amount,
      }
    })
}
```

一般来说，把 `Command` 对象抽取出来会更容易管理和测试，例如：

```ts
class IncrementCommand {
  constructor(count: number, amount: number) {
    this.#count = count
    this.#amount = amount
  }

  get prev() {
    return { count: this.#count }
  }

  get next() {
    return { count: this.#count + this.#amount }
  }
}

class Store extends Zeit {
  increase(amount: number) {
    this.execute(new IncrementCommand(this.state.count, amount))
  }
}
```

或者用函数式的方法：

```ts
function createIncrementCommand(count: number, amount: number) {
  return {
    prev: { count },
    next: { count: count + amount },
  }
}

class Store extends Zeit {
  increase(amount: number) {
    this.execute(createIncrementCommand(this.state.count, amount))
  }
}
```

接下来实例化这个 `Store`，此时可传递初始状态：

```ts
const initialState = {
  count: 0,
}

export const store = new Store(initialState)
```

由于 Zeit 本身并不与任何框架绑定，因此在框架中使用 `Store`时还需要进行绑定。例如在 React 中可以使用 Zustand 内置的 `useStore` 钩子来绑定：

```ts
import { useStore: _useStore } from 'zustand'

export const useStore = (selector) => _useStore(store, selector)
```

把新的 `useStore` hook 作为主要的访问状态的手段，下面是一个实例：

```tsx
import { useStore } from "my-app/hooks/use-store"

// 尽可能把 selector 定义在组件之外已得到最好的渲染优化，否则应该用 `useCallback` 封装。
const countSelector = (state: State) => state.count

function SomeComponent() {
  const count = useStore(countSelector)

  return (
    /** 只有 `count` 更新的时候才会重新渲染 */
    <div>{count}</div>
  )
}
```

如果需要细粒度的渲染控制，也可以实现对 `selector` 返回状态的引用相等性检查版本的 `useStore`：

```ts
import { useStoreWithEqualityFn } from "zustand/traditional"
import { store, type State } from "my-app/store"

export function useStore<T>(
  selector: (state: State) => T,
  equals: (prev: T, next: T) => boolean = Object.is, // 缺省用浅层对比
) {
  return useStoreWithEqualityFn(store, selector!, equals)
}
```

什么时候应该用？比如说 `store` 里面分别保存了两个属性 `pointX: number` 和 `pointY: number`，而实际使用的时候把它重新构造成了一个对象字面量：

```ts
const position = useStore((state) => ({ x: state.pointX, y: state.pointY }))
```

问题是，由于 `selector` 每次都返回了一个新对象，即使 `pointX` 和 `pointY` 都没有改变过，但新对象是不同的引用，因此还是会引起重新渲染。

一种解决办法是比较传统的：

```ts
const pointX = useStore((state) => state.pointX)
const pointY = useStore((state) => state.pointY)
const position = useMemo(() => ({ x: pointX, y: pointY }), [pointX, pointY])
```

实际上这个办法并不赖，如果 `position` 会被反复用到，那么把它封装成 hook 也没问题。但除此之外，还可以使用自定义的引用相等性判断来处理：

```ts
const position = useStore(
  (state) => ({ x: state.pointX, y: state.pointY }),
  (prev, next) => prev.x === next.x && prev.y === next.y,
)
```

如果状态是比较复杂的数据结构并且经常需要操作数组等复合对象，建议引入基于 Immutability 的工具来处理数据的更新。这里推荐使用 [Mutative](https://mutative.js.org/)，它和 immer 非常相似，但是速度却快不少，而且它还支持 Currying 的调用方法，使用起来更直观。

下面演示两个跟 Zeit 结合的例子：

1. 修改 `Map` 类型的数据，不涉及历史记录：

```ts
import { create } from "mutative"
import { store } from "my-app/store"

function setTodoItem(id: string, item: TodoItem) {
  const [draft, finalize] = create(store.state.todosMap)
  draft.set(id, item)
  store.patch({ todosMap: finalize() })
}
```

2. 修改 `Array` 类型的数据，并支持历史记录：

```ts
import { create, original } from "mutative"
import { store } from "my-app/store"

function deleteTodoItem(id) {
  const index = store.state.todoList.findIndex((todo) => todo.id === id)
  if (index > -1) {
    const [draft, finalize] = create(store.state.todoList)

    draft.splice(index, 1)
    store.execute({
      prev: { todoList: original(draft) },
      next: { todoList: finalize() },
    })
  }
}
```

> 如果不用支持 Immutability 的工具，那么利用 `saveSnapshot` 方法也可以实现例 2. 所演示的历史记录状态

## API

通过 `Zeit` 提供的内置 API 可以更灵活的满足业务逻辑的需求。

### `patch(patchState: Patch<State>): this`

`patch` 方法可以直接修改状态，但会绕过历史记录，从而不会影响 Undo/Redo 的状态。

例如在 `Store` 中有一个控制菜单开关的状态，打开或者关闭菜单是不应记录在历史操作中的，于是可以利用 `patch` 方法来实现：

```ts
class Store extends Zeit {
  toggleMenu() {
    this.patch({ menuOpen: !this.state.menuOpen })
  }
}
```

### `shallowPatch(patchState: Patch<State>): this`

`shallowPatch` 和 `patch` 区别在于对于根状态前者使用浅拷贝，后者则使用（递归）深
拷贝。当合并根状态对象时，如果一个属性本身就是对象字面量，深拷贝会不断递归合并，
遇到同名属性覆盖，其他属性则保留；但浅拷贝就直接覆盖这个属性了。

有时候修改的意图是要删除对象中的属性，那么只有浅拷贝直接把对象覆盖才能达成意图。例如：

```ts
/**
 * 假设初始状态为：`{ object: { foo: 'foo', bar: 'bar' } }`
 * 修改意图是去掉 `foo` 和更新 `bar`，则：
 */

// 深拷贝
zeit.patch({ object: { bar: 'new bar' } }) // <- 结果是：`{ foo: 'foo', bar: 'new bar' }`

// 浅拷贝
zeit.shallowPatch({ object: { bar: 'new bar' } }) // <- 结果是 : `{ bar: 'new bar' }`
```

> `execute` 方法也有一个浅拷贝版本 `shallowExecute`

### `replace(state: State): this`

`replace` 的功能和特点与 `patch` 类似，但 `replace` 会直接覆盖指定的状态而不是深度合并。比方说想要把一组选项直接重置为缺省值：

```ts
const defaultOptions = {
  // ...
}

class Store extends Zeit {
  resetOptions() {
    this.replace({ options: defaultOptions })
  }
}
```

注意，在调用 `replace` 的时候如果覆盖的状态是有关联的历史记录的，那么往往还需要调用 `resetHistory`，以便重置历史记录。

### `commit(next: State, prev: State, patchState: Patch<State>): State`

每次改变状态时，在将最新的状态发送给 Zustand 之前，都会调用 `commit` 方法。默认的实现直接返回了最新的状态，但也可以通过重写 `commit` 方法来实现自定义的逻辑。最常见的例子就是在返回状态之前需要打日志等等，可以把 `commit` 当成实现中间件的内置机制。

### `reset(): this`

将整个状态重置为实例化时的初始状态，此方法会强制执行 `resetHistory` 方法，将历史记录重置为初始状态。

---

公共 API 可直接被外部调用，比如说在组件内部直接调用：

```tsx
function MyComponent() {
  const count = useStore((state) => state.count)

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => store.increase(1)}>+</button>
      <button disabled={!store.canUndo} onClick={() => store.undo()}>
        Undo
      </button>
      <button disabled={!store.canRedo} onClick={() => store.redo()}>
        Redo
      </button>
    </div>
  )
}
```

### `get state(): State`

返回当前状态

### `get snapshot(): State`

返回最近的状态快照，參见后面 `saveSnapshot` 的说明。

### `get canUndo(): boolean`

返回是否可以撤销

### `get canRedo(): boolean`

返回是否可以重做

### `get history(): Command<State>[]`

返回全部历史记录。外部调用不能直接修改历史记录栈，但可以通过只读数据检视记录栈的内容，例如历史记录的长度等等。

### `saveSnapshot(): this`

将当前状态保存为快照，可通过 `this.snapshot` 获取快照状态。

有时候对于状态的更改和对应的历史记录并不是相同的粒度，例如：用户编辑一个文本框可能会键入多个字符，但从历史记录的角度来看，这些字符应该被视为一个整体来撤销或重做。

利用快照就很容易实现这样的功能，当用户聚焦文本框的时候立刻保存当前状态的快照：

```ts
onInputFocused() {
  this.saveSnapshot()
}
```

然后利用 `patch` 来更新用户键入的字符，并不会影响历史记录：

```ts
updateUserInput(text: string) {
  this.patch({ userInput: text })
}
```

最后当用户确认时（或失去焦点时等等）再做正式的状态更新：

```ts
onInputBlurred() {
  this.execute({
    prev: { userInput: this.snapshot.userInput },
    next: { userInput: this.state.userInput }
  })
}
```

这时如果执行 Undo/Redo 就可以一次完整的输入被撤销或重做了。

## 致敬

Zeit 在状态管理部份使用了优秀的 [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)。

## 许可协议

[MIT](LICENSE) License © 2023 [Choiceform](https://github.com/choice-form)
