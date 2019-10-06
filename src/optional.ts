import deepEqual from "fast-deep-equal";

class DefinitionError extends Error {
  public readonly name: string = "DefinitionError";
}

interface LazyDefine<T> {
  (...args: any[]): any;

  __define?: (definition: T) => void;
  __fun?: T;
}

const lazyDefine = <T extends CallableFunction>(): T => {
  const wrapper: LazyDefine<T> = (...args) => {
    if (wrapper.__fun == null) {
      throw new DefinitionError("function is not defined");
    }
    return wrapper.__fun(...args);
  };
  wrapper.__define = (definition: T): void => {
    Object.assign(wrapper, definition);
    wrapper.__fun = definition;
    delete wrapper.__define;
  };
  return (wrapper as unknown) as T;
};

const isLazyDefine = <T extends CallableFunction>(
  value: any,
): value is LazyDefine<T> => {
  return (
    (typeof value === "function" &&
      ("__define" in value && !("__fun" in value))) ||
    (!("__define" in value) && "__fun" in value)
  );
};

const define = <T extends CallableFunction>(undef: T, definition: T): T => {
  if (isLazyDefine(undef)) {
    if (undef.__define != null) {
      undef.__define(definition);
      return undef;
    } else {
      throw new DefinitionError("function is already defined");
    }
  }
  throw new DefinitionError("functions is not lazily defined");
};

// courtesy https://gist.github.com/navix/6c25c15e0a2d3cd0e5bce999e0086fc9
// this one works better for the match cases than the ts-essentials one
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly (DeepPartial<U>)[]
    : DeepPartial<T[P]>;
};

// const deepPick = <T extends { [index: string]: any }>(
//   me: T,
//   other: DeepPartial<T> | T,
//   cycle: readonly any[] = [],
// ): DeepPartial<T> => {
//   const partialMe: DeepPartial<T> = Object.keys(other).reduce(
//     (acc: DeepPartial<T>, key: keyof T) => {
//       acc[key] = me[key];
//       return acc;
//     },
//     {},
//   );
//   Object.keys(other).forEach((key: keyof T) => {
//     if (key in partialMe && key in other) {
//       if (cycle.includes(partialMe[key])) {
//         return;
//       }
//       const bla = partialMe[key];
//       if (
//         partialMe[key] != null &&
//         typeof partialMe[key] === "object" &&
//         other[key] != null &&
//         typeof other[key] === "object"
//       ) {
//         const a = other[key];
//         cycle = [...cycle, partialMe[key]];
//         partialMe[key] = deepPick(partialMe[key]!, a!, cycle);
//       }
//     }
//   });
//   return partialMe as DeepPartial<T>;
// };

// const partialCompare = <T extends object>(
//   me: T,
//   other: DeepPartial<T>,
// ): boolean => deepEqual(deepPick(me, other), other);

const partialCompare = <T extends object>(
  me: T | undefined,
  other: DeepPartial<T> | undefined,
): boolean => {
  if (typeof me === "object" && typeof other === "object") {
    if (me == null || other == null) {
      return me == other;
    }
    for (const key of Object.keys(other)) {
      const meValue = (me as DeepPartial<T>)[key as keyof T];
      const otherValue = other[key as keyof T];
      if (
        meValue != null &&
        typeof meValue === "object" &&
        otherValue != null &&
        typeof otherValue === "object"
      ) {
        return partialCompare(meValue, otherValue);
      } else if (!deepEqual(meValue, otherValue)) {
        return false;
      }
    }
    return true;
  } else {
    return deepEqual(me, other);
  }
};

interface Matcher<T, R> {
  fun: (value: T) => R | Promise<R>;
  test: (value: any) => boolean;
}

class Otherwise {}

const OtherwiseInstance = Object.freeze(new Otherwise());

export class Predicate<T> {
  private readonly _test: (value: T) => boolean;

  public constructor(test: (value: T) => boolean) {
    this._test = test;
  }

  public test(value: T): value is T {
    try {
      return this._test(value);
    } catch (err) {
      return false;
    }
  }
}

export const predicate = <T>(test: (value: T) => boolean): Predicate<T> =>
  new Predicate(test);

export const isNumber = predicate<number>((val) => typeof val === "number");
export const isString = predicate<string>((val) => typeof val === "string");
export const isBoolean = predicate<boolean>((val) => typeof val === "boolean");

const matcher = <T, R>(
  condition:
    | Otherwise
    | Predicate<T>
    | T
    | DeepPartial<T>
    | { new (...any: any[]): T },
  fun: (value: T) => R | Promise<R>,
): Matcher<T, R> => ({
  fun,
  test: (value: any): value is T => {
    if (condition instanceof Otherwise) {
      return true;
    }
    if (condition instanceof Predicate) {
      return condition.test(value);
    }
    if (typeof condition === "function") {
      return value instanceof condition;
    }
    return (
      value === condition ||
      (typeof value === "object" && partialCompare(value, condition))
    );
  },
});

export const when = <T, R>(
  condition: Predicate<T> | T | DeepPartial<T> | { new (...any: any[]): T },
  fun: (value: T) => R,
): Matcher<T, R> => matcher(condition, fun);

export const whenNumber = <R>(fun: (value: number) => R): Matcher<number, R> =>
  when(isNumber, fun);
export const whenString = <R>(fun: (value: string) => R): Matcher<string, R> =>
  when(isString, fun);
export const whenBoolean = <T, R>(
  fun: (value: boolean) => R,
): Matcher<boolean, R> => when(isBoolean, fun);

export const otherwise = <R>(fun: (value: unknown) => R) =>
  matcher(OtherwiseInstance, fun);

export class NoDefaultCaseError extends Error {
  public readonly name: string = "NoDefaultCaseError";
  public readonly message: string = "no default case in exhaustive match";
}

type OptionalTransducerResult<R> =
  | Promise<Optional<R>>
  | Optional<R>
  | Promise<R>
  | R;
type OptionalTransducer<T, R> = (value: T) => OptionalTransducerResult<R>;

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
    value != null &&
    typeof value.unwrap === "function" &&
    typeof value.get === "function" &&
    typeof value.map === "function" &&
    typeof value.forEach === "function" &&
    typeof value.reduce === "function" &&
    typeof value.match === "function" &&
    typeof value.otherwise === "function" &&
    typeof value.coalesce === "function" &&
    typeof value.move === "function" &&
    typeof value.moveIfExists === "function"
  );
};

export interface ValueMatch<R> {
  <T>(value: Promise<T>, defaultValue?: Promise<R>): Promise<R>;

  <T>(value: T, defaultValue?: R): R;
}

export const optional = lazyDefine<
  <T>(value: T | undefined | null | Promise<T>) => Optional<T>
>();
export const empty = <T>(): Optional<T> => optional<T>(undefined);

// ugly but works, 12 cases enough for now, increase when necessary
export const match = <
  R,
  // allows better typing in the executer functions
  T1,
  T2 = T1,
  T3 = T2,
  T4 = T3,
  T5 = T4,
  T6 = T5,
  T7 = T6,
  T8 = T7,
  T9 = T8,
  T10 = T9,
  T11 = T10,
  T12 = T11
>(
  m1: Matcher<T1, R>,
  m2?: Matcher<T2, R>,
  m3?: Matcher<T3, R>,
  m4?: Matcher<T4, R>,
  m5?: Matcher<T5, R>,
  m6?: Matcher<T6, R>,
  m7?: Matcher<T7, R>,
  m8?: Matcher<T8, R>,
  m9?: Matcher<T9, R>,
  m10?: Matcher<T10, R>,
  m11?: Matcher<T11, R>,
  m12?: Matcher<T12, R>,
): ValueMatch<R> => {
  const caseMatch = (value?: any, defaultValue?: any) => {
    if (m1 != null && m1.test(value)) {
      return m1.fun(value);
    }
    if (m2 != null && m2.test(value)) {
      return m2.fun(value);
    }
    if (m3 != null && m3.test(value)) {
      return m3.fun(value);
    }
    if (m4 != null && m4.test(value)) {
      return m4.fun(value);
    }
    if (m5 != null && m5.test(value)) {
      return m5.fun(value);
    }
    if (m6 != null && m6.test(value)) {
      return m6.fun(value);
    }
    if (m7 != null && m7.test(value)) {
      return m7.fun(value);
    }
    if (m8 != null && m8.test(value)) {
      return m8.fun(value);
    }
    if (m9 != null && m9.test(value)) {
      return m9.fun(value);
    }
    if (m10 != null && m10.test(value)) {
      return m10.fun(value);
    }
    if (m11 != null && m11.test(value)) {
      return m11.fun(value);
    }
    if (m12 != null && m12.test(value)) {
      return m12.fun(value);
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    } else {
      throw new NoDefaultCaseError();
    }
  };

  return <T>(value: T, defaultValue?: any): any => {
    if (value instanceof Promise) {
      return new Promise((resolve, reject) => {
        value
          .then((value) => {
            let val = null;
            try {
              val = caseMatch(value, defaultValue);
            } catch (err) {
              if (err instanceof NoDefaultCaseError) {
                try {
                  val = caseMatch(undefined, defaultValue);
                } catch (err) {
                  reject(err);
                }
              } else {
                return reject(err);
              }
            }
            resolve(val);
          })
          .catch(reject);
      });
    } else {
      try {
        return caseMatch(value, defaultValue);
      } catch (err) {
        if (err instanceof NoDefaultCaseError) {
          return caseMatch(undefined, defaultValue);
        } else {
          throw err;
        }
      }
    }
  };
};

export class NullError extends Error {
  public readonly name: string = "NullError";
  public readonly message: string = "attempted to access null value";
}

export class ValueMovedError extends Error {
  public readonly name: string = "ValueMovedError";
  public readonly message: string = "value moved and lost ownership";
}

const toPromise = <T>(value: T | null | undefined | Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (value == null) {
      return resolve(undefined);
    }
    if (value instanceof Promise) {
      return value.then(resolve).catch(reject);
    }
    return resolve(value);
  });
};

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

class OptionalImpl<T> implements Optional<T> {
  private readonly value: Promise<T | undefined | null>;
  private moved?: boolean;

  public constructor(value: Promise<T | undefined | null>) {
    this.value = value;
  }

  public async unwrap(): Promise<T | undefined> {
    try {
      const value = await this.value;
      return value == null ? undefined : value;
    } catch {
      return undefined;
    }
  }

  public otherwise<R = void>(fun: OptionalTransducer<void, R>): Optional<R> {
    return new OptionalImpl<R>(
      this.unwrap().then((value) => {
        if (value != null) {
          throw value;
        }
        return peel(fun()).get();
      }),
    );
  }

  public coalesce(fun: OptionalTransducer<void, T>): Optional<T> {
    return new OptionalImpl<T>(
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
    return new OptionalImpl(
      this.get(defaultValue, false).then((value) => {
        const mapped = mapper(value);
        return peel(mapped).get();
      }),
    );
  }

  private static createMoved<R>(): Optional<R> {
    const moved = new OptionalImpl<R>(toPromise(undefined));
    moved.moved = true;
    return moved;
  }

  public move(into: (value: T) => void | Promise<void>): Optional<T> {
    if (this.moved) {
      throw new ValueMovedError();
    }
    this.map(into);
    return OptionalImpl.createMoved();
  }

  public moveIfExists(into: (value: T) => void | Promise<void>): Optional<T> {
    if (this.moved) {
      return OptionalImpl.createMoved();
    }
    this.forEach(into);
    return OptionalImpl.createMoved();
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
    return new OptionalImpl(
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
    return new OptionalImpl<R>(
      this.unwrap().then((unwrapped) => {
        const matched = valueMatcher(unwrapped);
        return peel(matched).get();
      }),
    );
  }
}

define(optional, (value) => new OptionalImpl(toPromise(value)));

export const whenPresent = <T, R>(fun: (value: T) => R): Matcher<T, R> =>
  when<T, R>(predicate<T>((value) => value != null), fun);

export const whenOk = <T, R>(fun: (value: T) => R): Matcher<T, R> =>
  when<T, R>(predicate<T>((value) => !(value instanceof Error)), fun);

export const whenErr = <E extends Error, R>(
  fun: (value: E) => R,
): Matcher<E, R> =>
  when<E, R>(predicate<E>((val) => val instanceof Error), fun);

export class Result<T, E extends Error = Error> extends OptionalImpl<T | E> {
  public async get(
    defaultValue?: T,
    throwErrors: boolean = true, // throw by default
  ): Promise<T | E> {
    return super.get(defaultValue, throwErrors);
  }

  public whenOk<R>(
    fun: OptionalTransducer<T, R>,
  ): Matcher<T, OptionalTransducerResult<R>> {
    return whenOk(fun);
  }

  public ok<R>(fun: OptionalTransducer<T, R>): Optional<R> {
    return this.match(
      this.whenOk(fun),
      otherwise((val) => {
        throw val;
      }),
    );
  }

  public mapOk<R>(
    mapper: OptionalTransducer<T, R>,
    defaultValue?: T,
  ): Result<R, E> {
    return Result.fromOptional<R, E>(
      this.map(async (valueOrError) => {
        if (valueOrError instanceof Error) {
          return valueOrError;
        } else {
          const mapped = mapper(valueOrError);
          return peel(mapped).get();
        }
      }, defaultValue),
    );
  }

  public predicateOk(test: (value: T) => boolean): Predicate<T> {
    return predicate((value: T) => !(value instanceof Error) && test(value));
  }

  public whenErr<R>(
    fun: OptionalTransducer<E, R>,
  ): Matcher<E, OptionalTransducerResult<R>> {
    return whenErr(fun);
  }

  public async err<R>(fun: OptionalTransducer<E, R>): Promise<void> {
    await this.match(
      this.whenErr(fun),
      otherwise((val) => {
        throw val;
      }),
    );
  }

  public mapErr<R extends Error>(
    mapper: OptionalTransducer<E, R>,
    defaultValue?: E,
  ): Result<T, R> {
    return Result.fromOptional<T, R>(
      this.map(async (valueOrError) => {
        if (valueOrError instanceof Error) {
          const mapped = mapper(valueOrError);
          return peel(mapped).get();
        } else {
          return valueOrError;
        }
      }, defaultValue),
    );
  }

  public printErr(): Promise<void> {
    return this.err(console.error);
  }

  public predicateErr(test: (value: E) => boolean): Predicate<E> {
    return predicate((value: E) => value instanceof Error && test(value));
  }

  public static fromOptional<T, E extends Error>(
    opt: Optional<T | E>,
  ): Result<T, E> {
    return new Result<T, E>(opt.get());
  }

  public toOptional(defaultValue?: T): Optional<T> {
    return this.match(
      this.whenOk((value) => value),
      this.whenErr(() => optional(defaultValue)),
    );
  }
}

export const isResult = (value: any): value is Result<any, Error> => {
  const optValue = value; //for typescript
  return (
    isOptional(optValue) &&
    typeof value.ok === "function" &&
    typeof value.err === "function" &&
    typeof value.mapOk === "function" &&
    typeof value.mapErr === "function" &&
    typeof value.whenOk === "function" &&
    typeof value.whenErr === "function" &&
    typeof value.predicateOk === "function" &&
    typeof value.predicateErr === "function" &&
    typeof value.printErr === "function" &&
    typeof value.toOptional === "function"
  );
};

export const result = <T, E extends Error>(
  value: T | E | Promise<T>,
): Result<T, E> => {
  return new Result<T, E>(toPromise<T | E>(value));
};

export const ok = <T, E extends Error = Error>(
  value: T | Promise<T>,
): Result<T, E> => result<T, E>(value);

export const err = <T, E extends Error>(value: E): Result<T, E> =>
  result<T, E>(value);

export const unwrap = async <T>(
  value?: Optional<T>,
): Promise<T | undefined> => {
  if (value != null) {
    return await value.unwrap();
  }
  return undefined;
};

export const wrap = <T>(value: T | Optional<T> | undefined): Optional<T> =>
  isOptional(value) ? value : optional(value);

export type WrapOptional<T> = {
  [P in keyof T]: Optional<T[P]>;
};

export const just = <T>(value: T | undefined): T => {
  if (value == null) {
    throw new NullError("value is not just: " + JSON.stringify(value));
  } else {
    return value;
  }
};

export const resultBlock = async <T, E extends Error>(
  block: (
    just: <J>(res: Result<J, E>) => Promise<J>,
  ) => Result<T, E> | T | Promise<Result<T, E> | T>,
): Promise<Result<T, E>> => {
  class ExpectedError extends Error {
    public readonly name: string = "ExpectedError";

    public constructor(public readonly expected: E) {
      super("Caught expected error.");
    }
  }

  const just = async <J>(res: Result<J, E>, defaultValue?: J) => {
    const optError = res.match(res.whenErr((err) => err));
    const error = await optError.unwrap();
    if (error != null) {
      throw new ExpectedError(error);
    }
    return await res.ok((okValue) => okValue).get(defaultValue);
  };
  try {
    const blockResult = await block(just);
    // if it's a result the compiler enforces <T, E>
    if (isResult(blockResult)) {
      return blockResult as Result<T, E>;
    } else {
      return ok(blockResult as T);
    }
  } catch (error) {
    if (error instanceof ExpectedError) {
      return err(error.expected);
    } else {
      throw err;
    }
  }
};

interface PromiscuousJust {
  <J, E extends Error>(res: Result<J, E>): Promise<J>;
  <J>(res: Optional<J>): Promise<J>;
}

export const optionalBlock = async <T>(
  block: (
    just: PromiscuousJust,
  ) =>
    | Optional<T>
    | Result<T, Error>
    | T
    | Promise<Optional<T> | Result<T, Error> | T>,
): Promise<Optional<T>> => {
  const optionalResult = async <J, E extends Error>(
    res: Result<J, E>,
    defaultValue?: J,
  ): Promise<J> => {
    const optError = res.match(res.whenErr((err) => err));
    const error = await optError.unwrap();
    if (error != null) {
      throw new NullError();
    }
    return await res.ok((okValue) => okValue).get(defaultValue);
  };
  const optionalJust = async <J>(
    value: Optional<J>,
    defaultValue?: J,
  ): Promise<J> => {
    return await value.get(defaultValue);
  };
  const just: PromiscuousJust = async <J, E extends Error>(
    value: Optional<J> | Result<E>,
    defaultValue?: J,
  ): Promise<J> => {
    // we're trusting the typescript compiler here
    if (isResult(value)) {
      return await optionalResult(value, defaultValue);
    } else if (isOptional(value)) {
      return await optionalJust(value as Optional<J>, defaultValue);
    }
    throw value;
  };
  try {
    const blockResult = await block(just);
    // we're trusting the typescript compiler here
    if (isResult(blockResult)) {
      return blockResult.toOptional();
    } else if (isOptional(blockResult)) {
      return blockResult as Optional<T>;
    } else {
      return optional(blockResult);
    }
  } catch (error) {
    if (error instanceof NullError) {
      return empty();
    } else {
      throw error;
    }
  }
};
