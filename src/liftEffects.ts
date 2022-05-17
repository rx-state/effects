import { Effect } from "./Effect"
import { map, Observable, Subscriber } from "rxjs"
import { EffectObservable } from "./EffectObservable"
import { sinkEffects } from "sinkEffects"

type IsEmpty<T> = unknown extends T ? true : T extends never ? true : false

export function liftEffects(): <T, E>( // Not sure why was `L` needed - Tried different stuff and it all works ok
  source$: EffectObservable<T, E>,
) => EffectObservable<IsEmpty<E> extends true ? T : T | E, never>
export function liftEffects<Args extends Array<unknown>>(
  ...args: Args
): <T, E>(
  source$: EffectObservable<T, E>,
) => EffectObservable<
  | T
  | (IsEmpty<E> extends true
      ? Args[keyof Args & number] // simplified from [keyof Args extends number ? keyof Args : never]
      : E & Args[keyof Args & number]),
  IsEmpty<E> extends true ? never : Exclude<E, Args[keyof Args & number]>
>

export function liftEffects<Args extends Array<any>>(...args: Args) {
  type UnionArgTypes = Args[keyof Args extends number ? keyof Args : never]
  const toInclude = new Set(args)
  return <T, E>(
    source$: EffectObservable<T, E>,
  ): EffectObservable<
    unknown extends E ? T | UnionArgTypes : T | (UnionArgTypes & E),
    unknown extends E ? never : Exclude<E, UnionArgTypes>
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

const obs: EffectObservable<null | 1 | 2 | 3, never> = null as any
const r = obs.pipe(
  sinkEffects(null),
  map((v) => (v + 1) as 2 | 3 | 4),
  liftEffects(),
)
