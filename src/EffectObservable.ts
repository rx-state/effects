import { Observable, UnaryFunction } from "rxjs"

export interface EffectObservable<T, E> extends Observable<T> {
  ___internal?: E
  pipe: PipeEffect<T, E>
}

export interface EffectOperatorFunction<T, ET, R, ER>
  extends UnaryFunction<EffectObservable<T, ET>, EffectObservable<R, ER>> {}

interface PipeEffect<T, ET> {
  (): EffectObservable<T, ET>
  <A, EA>(op1: EffectOperatorFunction<T, ET, A, EA>): EffectObservable<A, EA>
  <A, EA, B, EB = EA>( // Default = EA is needed to support regular operators (so they output the same effect as their input, otherwise it's unknown)
    op1: EffectOperatorFunction<T, ET, A, EA>,
    op2: EffectOperatorFunction<A, EA, B, EB>,
  ): EffectObservable<B, EB>
  <A, EA, B, EB = EA, C = unknown, EC = EB>( // = unknown is needed because you can't have mandatory types after optional types.
    op1: EffectOperatorFunction<T, ET, A, EA>,
    op2: EffectOperatorFunction<A, EA, B, EB>,
    op3: EffectOperatorFunction<B, EB, C, EC>,
  ): EffectObservable<C, EC>
}
