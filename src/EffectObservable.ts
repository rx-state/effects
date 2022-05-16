import { Observable } from "rxjs"

export interface EffectObservable<T, E = never> extends Observable<T> {
  ___internal?: E
}
