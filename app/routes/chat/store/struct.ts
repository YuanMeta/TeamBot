import { observable, runInAction, isObservable } from 'mobx'

export class StructStore<T extends object> {
  state: T
  constructor(state: T) {
    if (isObservable(state)) {
      this.state = state
    } else {
      this.state = observable(state)
    }
  }
  setState(ctx: (state: T) => void) {
    runInAction(() => {
      ctx(this.state)
    })
  }
}
