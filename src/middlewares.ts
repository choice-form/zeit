import type { StateCreator, StoreApi } from 'zustand/vanilla'

type PatchFn<State> = (state: State) => Partial<State> | State
type Setter<State> = StoreApi<State>['setState']
type Getter<State> = StoreApi<State>['getState']

/**
 * @protected
 */
export function derivable<State, DerivedState>(
  create: StateCreator<State>,
  compute: (state: State) => DerivedState,
) {
  return (
    set: Setter<State & DerivedState>,
    get: Getter<State & DerivedState>,
    api: StoreApi<State & DerivedState>,
  ): State & DerivedState => {
    const setWithDerivedState: Setter<State & DerivedState> = (
      patch,
      replace,
    ) => {
      set((state) => {
        const nextState =
          typeof patch === 'function'
            ? (patch as PatchFn<State & DerivedState>)(state)
            : patch
        const derivedState = compute({ ...state, ...nextState })
        return { ...nextState, ...derivedState }
      }, replace)
    }
    api.setState = setWithDerivedState
    const state = create(setWithDerivedState, get, api)
    return { ...state, ...compute(state) }
  }
}
