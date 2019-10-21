import deepEqual from "fast-deep-equal";
import { ExtendRuntimeError } from "./error";

// courtesy https://gist.github.com/navix/6c25c15e0a2d3cd0e5bce999e0086fc9
// this one works better for the match cases than the ts-essentials one
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly (DeepPartial<U>)[]
    : DeepPartial<T[P]>;
};

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

export interface Matcher<T, R> {
  fun: (value: T) => R | Promise<R>;
  test: (value: any) => boolean;
}

class Otherwise {}

const OtherwiseInstance = Object.freeze(new Otherwise());

export class Predicate<T> {
  public constructor(private readonly predicate: (value: T) => boolean) {}

  public test(value: T): value is T {
    try {
      return this.predicate(value);
    } catch (err) {
      return false;
    }
  }
}

export const predicate = <T>(test: (value: any) => boolean): Predicate<T> =>
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

export const whenPresent = <T, R>(fun: (value: T) => R): Matcher<T, R> =>
  when<T, R>(predicate<T>((value) => value != null), fun);
export const whenNumber = <R>(fun: (value: number) => R): Matcher<number, R> =>
  when(isNumber, fun);
export const whenString = <R>(fun: (value: string) => R): Matcher<string, R> =>
  when(isString, fun);
export const whenBoolean = <T, R>(
  fun: (value: boolean) => R,
): Matcher<boolean, R> => when(isBoolean, fun);

export const otherwise = <R>(fun: (value: unknown) => R) =>
  matcher(OtherwiseInstance, fun);

export class NoDefaultCaseError extends ExtendRuntimeError(
  "NoDefaultCaseError",
  "no default case in exhaustive match",
) {}

export interface ValueMatch<R> {
  <T>(value: Promise<T>, defaultValue?: Promise<R>): Promise<R>;

  <T>(value: T, defaultValue?: R): R;
}

// ugly but works, 12 cases enough for now, increase when necessary
export function match<
  R,
  // allows individual typing in the executer functions
  T1,
  T2,
  T3,
  T4,
  T5,
  T6,
  T7,
  T8,
  T9,
  T10,
  T11,
  T12
>(
  /* eslint-disable @typescript-eslint/no-unused-vars */
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
  /* eslint-enable @typescript-eslint/no-unused-vars */
): ValueMatch<R> {
  // rest parameter not appropriate here
  // eslint-disable-next-line prefer-rest-params
  const matchers = arguments;
  const caseMatch = (value?: any, defaultValue?: any) => {
    for (const m of matchers) {
      if (m != null && m.test(value)) {
        return m.fun(value);
      }
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    } else {
      throw new NoDefaultCaseError();
    }
  };

  return <T>(value: T | Promise<T>, defaultValue?: T): T | Promise<T> => {
    if (value instanceof Promise) {
      return new Promise((resolve, reject) => {
        value
          .then((value: T) => {
            let val = null;
            try {
              val = caseMatch(value, defaultValue);
              return resolve(val);
            } catch (err) {
              return reject(err);
            }
          })
          .catch((err) =>
            defaultValue != null ? resolve(defaultValue) : reject(err),
          );
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
}
