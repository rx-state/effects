import {
  concat,
  from,
  map,
  Observable,
  scan,
  take,
  throwError,
  timer,
} from "rxjs"
import { sinkEffects, effect, Effect, liftEffects } from "./"

describe("sinkEffects", () => {
  it("propagates sinked effects as errors", () => {
    const test$ = from([1, null, 3, null, 5]).pipe(sinkEffects(null))

    const values: Array<number | null> = []
    const errors = new Array<any>()
    test$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        errors.push(e)
      },
    )

    expect(values).toEqual([1])
    expect(errors).toEqual([effect(null)])
  })

  it("keeps the source subscription alive after synchronously re-subscribing upon receiving an effect", () => {
    let nSubscriptions = 0
    const source$ = new Observable<number>((observer) => {
      nSubscriptions++
      for (let i = 0; i < 10 && !observer.closed; i++) {
        observer.next(i)
      }
    })

    const values: Array<number | null> = []
    const errors = new Array<any>()
    const sinked$ = source$.pipe(sinkEffects(3))
    sinked$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        if (e instanceof Effect) {
          errors.push(e.value)
          sinked$.subscribe((x) => {
            values.push(x)
          })
        } else {
          errors.push(e)
        }
      },
    )

    expect(nSubscriptions).toBe(1)
    expect(values).toEqual([0, 1, 2, 4, 5, 6, 7, 8, 9])
    expect(errors).toEqual([3])
  })

  it("propagates errors", () => {
    let nSubscriptions = 0
    const source$ = new Observable<number>((observer) => {
      nSubscriptions++
      for (let i = 0; i < 10 && !observer.closed; i++) {
        if (i === 2) observer.error(2)
        observer.next(i)
      }
    })

    const values: Array<number | null> = []
    const errors = new Array<any>()
    const sinked$ = source$.pipe(sinkEffects(3))
    sinked$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        if (e instanceof Effect) {
          errors.push(e.value)
          sinked$.subscribe((x) => {
            values.push(x)
          })
        } else {
          errors.push(e)
        }
      },
    )

    expect(nSubscriptions).toBe(1)
    expect(values).toEqual([0, 1])
    expect(errors).toEqual([2])
  })

  it("propagates completes", () => {
    let nSubscriptions = 0
    const source$ = new Observable<number>((observer) => {
      nSubscriptions++
      for (let i = 0; i < 10 && !observer.closed; i++) {
        if (i === 2) observer.complete()
        observer.next(i)
      }
    })

    const values: Array<number | null> = []
    const errors = new Array<any>()
    const sinked$ = source$.pipe(sinkEffects(3))
    sinked$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        if (e instanceof Effect) {
          errors.push(e.value)
          sinked$.subscribe((x) => {
            values.push(x)
          })
        } else {
          errors.push(e)
        }
      },
    )

    expect(nSubscriptions).toBe(1)
    expect(values).toEqual([0, 1])
    expect(errors).toEqual([])
  })
})

describe("liftEffects", () => {
  it("lift the effects", () => {
    let nSubscriptions = 0
    const source$ = new Observable<number>((observer) => {
      nSubscriptions++
      for (let i = 0; i < 10 && !observer.closed; i++) {
        observer.next(i)
      }
    })

    const values: Array<number | null> = []
    const errors = new Array<any>()
    const values$ = source$.pipe(
      sinkEffects(3, 6),
      map((x) => x * 2),
      liftEffects(3, 6),
      take(9),
    )
    values$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        errors.push(e)
      },
    )

    expect(nSubscriptions).toBe(1)
    expect(values).toEqual([0, 2, 4, 3, 8, 10, 6, 14, 16])
    expect(errors).toEqual([])
  })

  it("works with complex async values", async () => {
    const test$ = concat([null], timer(20)).pipe(
      sinkEffects(null),
      map((x) => x + 10),
      liftEffects(null),
    )

    const values: Array<number | null> = []
    const errors = new Array<any>()
    test$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        errors.push(e instanceof Effect ? e.value : e)
      },
    )

    await new Promise((res) => setTimeout(res, 30))

    expect(values).toEqual([null, 10])
    expect(errors).toEqual([])
  })

  it("propagates normal errors", async () => {
    const test$ = concat([null], timer(20), throwError("foo")).pipe(
      sinkEffects(null),
      map((x) => x + 10),
      liftEffects(null),
    )

    const values: Array<number | null> = []
    const errors = new Array<any>()
    test$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        errors.push(e instanceof Effect ? e.value : e)
      },
    )

    await new Promise((res) => setTimeout(res, 30))

    expect(values).toEqual([null, 10])
    expect(errors).toEqual(["foo"])
  })

  it("resets stateful Observables upon effect emission", async () => {
    const test$ = from([1, 2, 3, 4, 5, 6, 7, 8]).pipe(
      sinkEffects(3, 6),
      scan((a, b) => a + b, 0),
      liftEffects(3, 6, 10),
    )

    const values: Array<number | null> = []
    const errors = new Array<any>()
    test$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        errors.push(e instanceof Effect ? e.value : e)
      },
    )

    await new Promise((res) => setTimeout(res, 30))

    expect(values).toEqual([1, 3, 3, 4, 9, 6, 7, 15])
    expect(errors).toEqual([])
  })

  it("lifts all effects when non are passed", async () => {
    const test$ = from([1, 2, 3, 4, 5, 6, 7, 8]).pipe(
      sinkEffects(3, 6),
      scan((a, b) => a + b, 0),
      liftEffects<number>(),
    )

    const values: Array<number> = []
    const errors = new Array<any>()
    test$.subscribe(
      (x) => {
        values.push(x)
      },
      (e) => {
        errors.push(e instanceof Effect ? e.value : e)
      },
    )

    await new Promise((res) => setTimeout(res, 30))

    expect(values).toEqual([1, 3, 3, 4, 9, 6, 7, 15])
    expect(errors).toEqual([])
  })
})
