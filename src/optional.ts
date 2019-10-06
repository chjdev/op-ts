import { match, Matcher } from "./match";

export class NullError extends Error {
  public readonly name: string = "NullError";
  public readonly message: string = "attempted to access null value";
}

export class ValueMovedError extends Error {
  public readonly name: string = "ValueMovedError";
  public readonly message: string = "value moved and lost ownership";
}

export type OptionalTransducerResult<R> =
  | Promise<Optional<R>>
  | Optional<R>
  | Promise<R>
  | R;

export type OptionalTransducer<T, R> = (
  value: T,
) => OptionalTransducerResult<R>;

export interface Optional<T> {
  unwrap(): Promise<T | undefined>;

  otherwise<R = void>(fun: OptionalTransducer<void, R>): Optional<R>;

  coalesce(fun: OptionalTransducer<void, T>): Optional<T>;

  get(defaultValue?: T): Promise<T>;

  map<R>(mapper: OptionalTransducer<T, R>, defaultValue?: T): Optional<R>;

  forEach(
    fun: (value: T) => void | Promise<void>,
    defaultValue?: T,
  ): Promise<void>;

  reduce<R>(
    reducer: (prevValue: R, value: T) => OptionalTransducerResult<R>,
    initialValue: R,
    defaultValue?: T,
  ): Optional<R>;

  move(into: (value: T) => void | Promise<void>): Optional<T>;
  moveIfExists(into: (value: T) => void | Promise<void>): Optional<T>;

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

export const isOptional = (value: any): value is Optional<any> => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    value instanceof _OptionalImpl ||
    (value != null &&
      typeof value.unwrap === "function" &&
      typeof value.get === "function" &&
      typeof value.map === "function" &&
      typeof value.forEach === "function" &&
      typeof value.reduce === "function" &&
      typeof value.match === "function" &&
      typeof value.otherwise === "function" &&
      typeof value.coalesce === "function" &&
      typeof value.move === "function" &&
      typeof value.moveIfExists === "function")
  );
};

export const _toPromise = <T>(
  value: T | undefined | null | Promise<T | null | undefined>,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (value == null) {
      return resolve(undefined);
    }
    if (value instanceof Promise) {
      return value
        .then((val) => (val == null ? resolve(undefined) : resolve(val)))
        .catch(reject);
    }
    return resolve(value);
  });
};

export const optional = <T>(
  value: T | undefined | null | Promise<T | null | undefined>,
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
) => new _OptionalImpl<T>(_toPromise<T>(value));

export const empty = <T>(): Optional<T> => optional<T>(undefined);

export const peel = <R>(value: OptionalTransducerResult<R>): Optional<R> => {
  if (isOptional(value)) {
    return optional(value.get());
  } else if (value instanceof Promise) {
    const promise: Promise<R | Optional<R>> = value;
    const peeledPromise: Promise<R> = promise.then((value: R | Optional<R>) => {
      const peeled = peel(value);
      return peeled.get();
    });
    return optional(peeledPromise);
  } else {
    return optional(value);
  }
};

// eslint-disable-next-line @typescript-eslint/class-name-casing
export class _OptionalImpl<T> implements Optional<T> {
  private moved?: boolean;

  public constructor(private readonly value: Promise<T | undefined | null>) {}

  public async unwrap(): Promise<T | undefined> {
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
          throw value;
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
        throw new ValueMovedError();
      } else {
        return defaultValue;
      }
    }
    try {
      const unwrapped = await this.value;
      if (unwrapped != null) {
        if (throwErrors && unwrapped instanceof Error) {
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
    const moved = optional<R>(_toPromise(undefined));
    moved.moved = true;
    return moved;
  }

  public move(into: (value: T) => void | Promise<void>): Optional<T> {
    if (this.moved) {
      throw new ValueMovedError();
    }
    this.map(into);
    return _OptionalImpl.createMoved();
  }

  public moveIfExists(into: (value: T) => void | Promise<void>): Optional<T> {
    if (this.moved) {
      return _OptionalImpl.createMoved();
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
        const matched = valueMatcher(unwrapped);
        return peel(matched).get();
      }),
    );
  }
}
