import { Effect } from "./Effect"
import { Observable, Subscriber } from "rxjs"
import { EffectObservable } from "EffectObservable"

const internal = Symbol("")
type Internal = typeof internal

export function liftEffects<L = Internal>(): <T, E = Internal>(
  source$: EffectObservable<T, E>,
) => EffectObservable<
  E extends Internal
    ? T | (L extends Internal ? unknown : L)
    : T | (L extends Internal ? E : E | L),
  never
>
export function liftEffects<Args extends Array<any>>(
  ...args: Args
): <T, E = Internal>(
  source$: EffectObservable<T, E>,
) => EffectObservable<
  E extends Internal
    ? T | Args[keyof Args extends number ? keyof Args : never]
    : T | (Args[keyof Args extends number ? keyof Args : never] & E),
  E extends Internal
    ? never
    : Exclude<E, Args[keyof Args extends number ? keyof Args : never]>
>

export function liftEffects<Args extends Array<any>>(...args: Args) {
  type UnionArgTypes = Args[keyof Args extends number ? keyof Args : never]
  const toInclude = new Set(args)
  return <T, E = Internal>(
    source$: EffectObservable<T, E>,
  ): EffectObservable<
    E extends Internal ? T | UnionArgTypes : T | (UnionArgTypes & E),
    E extends Internal ? never : Exclude<E, UnionArgTypes>
  > => {
    return new Observable((observer) => {
      let subscriber: Subscriber<any>

      const setSubscriber = () => {
        subscriber = new Subscriber<T>({
          next(v: T) {
            observer.next(v as any)
          },
          error(e: unknown) {
            if (
              e instanceof Effect &&
              (toInclude.has(e.value) || !toInclude.size)
            ) {
              observer.next(e.value)
              setSubscriber()
            } else observer.error(e)
          },
          complete() {
            observer.complete()
          },
        })
        source$.subscribe(subscriber)
      }

      setSubscriber()

      return () => {
        subscriber.unsubscribe()
      }
    })
  }
}
