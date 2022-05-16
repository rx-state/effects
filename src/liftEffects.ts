import { Effect } from "./Effect"
import { Observable, Subscriber } from "rxjs"
import { EffectObservable } from "EffectObservable"

export function liftEffects<L>(): <T, E>(
  source$: EffectObservable<T, E>,
) => EffectObservable<
  unknown extends E
    ? T | (unknown extends L ? unknown : L)
    : T | (unknown extends L ? E : E | L),
  never
>
export function liftEffects<Args extends Array<any>>(
  ...args: Args
): <T, E>(
  source$: EffectObservable<T, E>,
) => EffectObservable<
  unknown extends E
    ? T | Args[keyof Args extends number ? keyof Args : never]
    : T | (Args[keyof Args extends number ? keyof Args : never] & E),
  unknown extends E
    ? never
    : Exclude<E, Args[keyof Args extends number ? keyof Args : never]>
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
