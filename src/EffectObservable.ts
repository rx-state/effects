import { Observable } from "rxjs"

export interface EffectObservable<T, E> extends Observable<T> {
  ___internal?: E
}
