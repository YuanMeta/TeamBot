import { useLocalObservable } from 'mobx-react-lite'
import { action, type AnnotationsMap } from 'mobx'
import { useCallback, useLayoutEffect } from 'react'
import { Subject, Observable } from 'rxjs'
type GetFields<
  T,
  K = {
    [P in keyof T]: T[P] extends Function ? never : P
  }
> = K[keyof K]

type SetState<T extends Record<string, any>, F extends GetFields<T>> = (
  data: { [P in F]?: T[P] } | ((state: T) => void)
) => void
export const useLocalState = <T extends Record<string, any>>(
  data: (() => T) | T,
  annotations?: AnnotationsMap<T, never>
): [T, SetState<T, GetFields<T>>] => {
  const state = useLocalObservable(() => {
    return data instanceof Function ? data() : data
  }, annotations) as T
  const setState = useCallback(
    action((data: any) => {
      if (data instanceof Function) {
        // @ts-ignore
        data(state)
      } else {
        for (let key of Object.keys(data)) {
          // @ts-ignore
          state[key] = data[key]
        }
      }
    }),
    []
  )
  return [state, setState]
}

export const useSubject = <T>(
  subject: Subject<T> | Observable<T>,
  fn: (value: T) => void,
  deps: any[] = []
) => {
  useLayoutEffect(() => {
    const cancel = subject.subscribe(fn)
    return () => cancel.unsubscribe()
  }, deps)
}
