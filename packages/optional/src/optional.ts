import { match, Matcher, NoDefaultCaseError } from "@opresults/match";
import { ExtendRuntimeError, RuntimeError } from "@opresults/common";

/**
 * Thrown when trying to access empty optionals.
 */
export class NullError extends ExtendRuntimeError(
  "NullError",
  "attempted to access null value",
) {}

/**
 * Thrown when trying to access a moved optional.
 */
export class ValueMovedError extends ExtendRuntimeError(
  "ValueMovedError",
  "value moved and lost ownership",
) {}

/**
 * Valid return values for `Optional` transducers. Either a plain value, another
 * `Optional`, or a `Promise` of either.
 */
export type OptionalTransducerResult<R> =
  | Promise<Optional<R>>
  | Optional<R>
  | Promise<R>
  | R;

/**
 * A transducer to modify an optional. Aka `mapper` function, but also used
 * outside of `map`.
 * Takes a plain value of `T` and returns a new different result of `R`.
 */
export type OptionalTransducer<T, R> = (
  value: T,
) => OptionalTransducerResult<R>;

/**
 * `Optional`s wrap potentially unavailable values and provide functions
 * to safely use them in computations.
 * Unavailable values might be `undefined`, `null`, or rejected `Promise`s.
 * A special case are `RuntimeError` and `Error` objects. These are treated as
 * unavailable if `throwErrors` is set to true when using `get`.
 *
 * @example
 * const o: Optional<string> = ...;
 * await o.map((str) => str.length).map((len) => len * 2).forEach(console.log);
 */
export interface Optional<T> {
  /**
   * Safely unwrap the value from the `Optional`.
   * @returns the value if present or `undefined`
   */
  unwrap(): Promise<T | undefined>;

  /**
   * Try to get the value of the optional.
   * @param defaultValue optional default value
   * @throws NullError if the optional is unfilled and no default value was
   *  provided
   * @throws ValueMovedError if the optional has moved and no default value was
   *  provided
   * @returns the value if present
   */
  get(defaultValue?: T): Promise<T>;

  /**
   * Ran when the optional is unfilled.
   * @param fun a transducer taking no input and returning an optional value
   * @returns an `Optional` containing the result of `fun` if it has run
   */
  otherwise<R = void>(fun: OptionalTransducer<void, R>): Optional<R>;

  /**
   * Coalesce this optional with a transducer result, i.e. if this optional is
   * unfilled, use the return value of the transducer
   * @param fun a transducer taking no input and returning a value.
   * @returns an `Optional` coalesced by a transducer
   */
  coalesce(fun: OptionalTransducer<void, T>): Optional<T>;

  /**
   * Transform the optionals content (if present).
   * @param mapper a transducer taking a value of `T` and transforming it into
   *  an `R`
   * @param defaultValue optional default value
   * @returns an `Optional` possibly containing the transduced value
   * @throws ValueMovedError this `Optional` has moved
   */
  map<R>(mapper: OptionalTransducer<T, R>, defaultValue?: T): Optional<R>;

  /**
   * Run a function if the `Optional` is filled.
   * @param fun the function to run, taking the value
   * @param defaultValue optional default value
   * @throws ValueMovedError this `Optional` has moved
   */
  forEach(
    fun: (value: T) => void | Promise<void>,
    defaultValue?: T,
  ): Promise<void>;

  /**
   * If present reduce the value onto the initial value
   * @param reducer reducer function taking previous (initial) value and current
   *  value and returns a new value
   * @param initialValue the initial value
   * @param defaultValue optional default value
   * @returns a new `Optional` possibly containing the reduced value
   * @throws ValueMovedError this `Optional` has moved
   */
  reduce<R>(
    reducer: (prevValue: R, value: T) => OptionalTransducerResult<R>,
    initialValue: R,
    defaultValue?: T,
  ): Optional<R>;

  /**
   * Move the value of this optional (if present) into the provided function
   * @param into function to be called with the `Optional`s value
   * @returns a moved `Optional`
   * @throws ValueMovedError this `Optional` has moved
   *
   * @example
   * let seconds: Optional<number> = optional(5);
   * seconds = seconds.move(setTimeout);
   * // seconds.get(); // throws ValueMovedError
   */
  move(into: (value: T) => void | Promise<void>): Optional<T>;

  /**
   * Concat multiple `Optional`s together. They will only resolve if each
   * individual `Optional` resolves.
   * @param others the `Optional`s to concat with this optional
   * @returns an `Optional` that resolves to an array of the invidiual
   *  `Optional`s values
   *
   * @example
   * const a = optional(1);
   * const b = optional(2);
   * const c = optional(3);
   * const empt = empty<number>();
   * await a.concat(b, c).get(); // [1, 2, 3]
   * await b.concat(c, a).get(); // [2, 3, 1]
   * // await b.concat(c, empt, a).get(); // throws NullError
   */
  concat<A>(...others: Optional<A>[]): Optional<(T | A)[]>;

  /**
   * Allow type safe matching on this optional. @see match
   * @param m1-m12 matching functions returning transducer results
   * @returns `Optional` possibly containing the matched result
   *
   * @example
   * optional(1)
   *   .match(
   *     when(2, () => -1),
   *     when(1, (val) => optional(val * 3)),
   *     otherwise(() => -1),
   *   ).get(); // 3
   */
  match<
    R,
    T1 extends T | unknown,
    T2 extends T | unknown,
    T3 extends T | unknown,
    T4 extends T | unknown,
    T5 extends T | unknown,
    T6 extends T | unknown,
    T7 extends T | unknown,
    T8 extends T | unknown,
    T9 extends T | unknown,
    T10 extends T | unknown,
    T11 extends T | unknown,
    T12 extends T | unknown
  >(
    m1: Matcher<T1, OptionalTransducerResult<R>>,
    m2?: Matcher<T2, OptionalTransducerResult<R>>,
    m3?: Matcher<T3, OptionalTransducerResult<R>>,
    m4?: Matcher<T4, OptionalTransducerResult<R>>,
    m5?: Matcher<T5, OptionalTransducerResult<R>>,
    m6?: Matcher<T6, OptionalTransducerResult<R>>,
    m7?: Matcher<T7, OptionalTransducerResult<R>>,
    m8?: Matcher<T8, OptionalTransducerResult<R>>,
    m9?: Matcher<T9, OptionalTransducerResult<R>>,
    m10?: Matcher<T10, OptionalTransducerResult<R>>,
    m11?: Matcher<T11, OptionalTransducerResult<R>>,
    m12?: Matcher<T12, OptionalTransducerResult<R>>,
  ): Optional<R>;
}

/**
 * Convenience type to have an optional `Optional` typing in addition to the
 * normal type.
 */
export type OrOptional<T> = T | Optional<T>;

/**
 * type guard to check whether a value is an `Optional`.
 * @param value the value to check
 * @returns value is an `Optional`
 */
export const isOptional = (value: any): value is Optional<unknown> => {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return value != null && value instanceof _OptionalImpl;
};

/**
 * Internal method that converts an opitonal value ?T or Promise<?T> to a Promise<?T>
 * @param value the value to convert
 */
export const _toPromise = <T>(
  value: T | undefined | null | Promise<T | null | undefined>,
): Promise<T | undefined | null> => {
  if (value instanceof Promise) {
    return value.then(_toPromise);
  }
  return new Promise((resolve, reject) => {
    if (value instanceof Error) {
      return reject(value);
    }
    return resolve(value);
  });
};

/**
 * Creates a new `Optional` from an optional value or a promise
 * @param value an optional value of ?T or a Promise<?T>
 * @returns `Optional` wrapped value
 */
export const optional = <T>(
  value: T | undefined | null | Promise<T | null | undefined>,
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
): Optional<T> => new _OptionalImpl<T>(_toPromise<T>(value));

/**
 * @returns an empty `Optional`
 */
export const empty = <T>(): Optional<T> => optional<T>(undefined);

/**
 * Convert a transducer result to a plain `Optional`
 * @param value a transducer result
 * @returns plain `Optional`
 */
const peel = <R>(value: OptionalTransducerResult<R>): Optional<R> => {
  if (isOptional(value)) {
    return value;
  } else if (value instanceof Promise) {
    const promise: Promise<R | Optional<R>> = value;
    const peeledPromise: Promise<R> = promise.then((value: R | Optional<R>) => {
      const peeled = peel(value);
      return peeled.get();
    });
    return optional(peeledPromise);
  } else if (value == null) {
    return empty();
  } else {
    return optional(value);
  }
};

// eslint-disable-next-line @typescript-eslint/class-name-casing
export class _OptionalImpl<T> implements Optional<T> {
  private moved?: boolean;

  public constructor(private readonly value: Promise<T | undefined | null>) {}

  public async unwrap(): Promise<T | undefined> {
    if (this.moved) {
      return Promise.reject(new ValueMovedError());
    }
    try {
      const value = await this.value;
      return value == null ? undefined : value;
    } catch {
      return undefined;
    }
  }

  public otherwise<R = void>(fun: OptionalTransducer<void, R>): Optional<R> {
    return optional<R>(
      this.unwrap().then((value) => {
        if (value != null) {
          return Promise.reject(value);
        }
        return peel(fun()).get();
      }),
    );
  }

  public coalesce(fun: OptionalTransducer<void, T>): Optional<T> {
    return optional<T>(
      this.unwrap().then((value) => {
        if (value != null) {
          return value;
        }
        return peel(fun()).get();
      }),
    );
  }

  public async get(defaultValue?: T, throwErrors: boolean = false): Promise<T> {
    if (this.moved) {
      if (defaultValue == null) {
        return Promise.reject(new ValueMovedError());
      } else {
        return defaultValue;
      }
    }
    try {
      const unwrapped = await this.value;
      if (unwrapped != null) {
        if (
          throwErrors &&
          (unwrapped instanceof RuntimeError || unwrapped instanceof Error)
        ) {
          if (defaultValue != null) {
            return defaultValue;
          }
          throw unwrapped;
        }
        return unwrapped;
      }
      if (defaultValue != null) {
        return defaultValue;
      }
    } catch (err) {
      if (defaultValue != null) {
        return defaultValue;
      }
      if (err == null) {
        throw new NullError();
      }
      throw err;
    }
    throw new NullError();
  }

  public map<R>(
    mapper: OptionalTransducer<T, R>,
    defaultValue?: T,
  ): Optional<R> {
    return optional(
      this.get(defaultValue, false).then((value) => {
        const mapped = mapper(value);
        return peel(mapped).get();
      }),
    );
  }

  private static createMoved<R>(): Optional<R> {
    const moved = new _OptionalImpl<R>(_toPromise(undefined));
    moved.moved = true;
    return moved;
  }

  public move(into: (value: T) => void | Promise<void>): Optional<T> {
    if (this.moved) {
      return this;
    }
    this.forEach(into);
    return _OptionalImpl.createMoved();
  }

  public async forEach(
    fun: (value: T) => void | Promise<void>,
    defaultValue?: T,
  ): Promise<void> {
    try {
      await fun(await this.get(defaultValue, false));
    } catch (err) {
      //silently fail
    }
  }

  public reduce<R>(
    reducer: (prevValue: R, value: T) => OptionalTransducerResult<R>,
    initialValue: R,
    defaultValue?: T,
  ): Optional<R> {
    return optional(
      this.get(defaultValue, false).then((value) =>
        peel(reducer(initialValue, value)).get(),
      ),
    );
  }

  public concat<A>(...others: Optional<A>[]): Optional<(T | A)[]> {
    return others.reduce((acc, other) => {
      return acc.map((vals) =>
        other.map((otherVal) => {
          vals.push(otherVal);
          return vals;
        }),
      );
    }, this.map((val) => [val] as (T | A)[]));
  }

  public match<
    R,
    T1 extends T | unknown,
    T2 extends T | unknown,
    T3 extends T | unknown,
    T4 extends T | unknown,
    T5 extends T | unknown,
    T6 extends T | unknown,
    T7 extends T | unknown,
    T8 extends T | unknown,
    T9 extends T | unknown,
    T10 extends T | unknown,
    T11 extends T | unknown,
    T12 extends T | unknown
  >(
    m1: Matcher<T1, OptionalTransducerResult<R>>,
    m2?: Matcher<T2, OptionalTransducerResult<R>>,
    m3?: Matcher<T3, OptionalTransducerResult<R>>,
    m4?: Matcher<T4, OptionalTransducerResult<R>>,
    m5?: Matcher<T5, OptionalTransducerResult<R>>,
    m6?: Matcher<T6, OptionalTransducerResult<R>>,
    m7?: Matcher<T7, OptionalTransducerResult<R>>,
    m8?: Matcher<T8, OptionalTransducerResult<R>>,
    m9?: Matcher<T9, OptionalTransducerResult<R>>,
    m10?: Matcher<T10, OptionalTransducerResult<R>>,
    m11?: Matcher<T11, OptionalTransducerResult<R>>,
    m12?: Matcher<T12, OptionalTransducerResult<R>>,
  ): Optional<R> {
    const valueMatcher = match(
      m1,
      m2,
      m3,
      m4,
      m5,
      m6,
      m7,
      m8,
      m9,
      m10,
      m11,
      m12,
    );
    return optional<R>(
      this.unwrap().then((unwrapped) => {
        try {
          const matched = valueMatcher(unwrapped);
          return peel(matched).get();
        } catch (err) {
          if (err instanceof NoDefaultCaseError) {
            return undefined;
          }
          throw err;
        }
      }),
    );
  }
}
