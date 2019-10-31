import deepEqual from "fast-deep-equal";
import { ExtendRuntimeError } from "@opresults/common";

/**
 * internal tag for the catch all path of a `match` function
 */
class Otherwise {}

const OtherwiseInstance = Object.freeze(new Otherwise());

/**
 * A `Predicate` tests whether a matched value fits the expected type based
 * on a test function, similar to a type guard.
 */
export class Predicate<T> {
  /**
   * @param predicate the test function to use
   */
  public constructor(private readonly predicate: (value: T) => boolean) {}

  /**
   * call the test function for a specified value
   * @param value the value to test
   */
  public test(value: any): value is T {
    try {
      return this.predicate(value);
    } catch (err) {
      return false;
    }
  }
}

/**
 * create a `Predicate` for this test function
 * @param test the test function
 * @returns a new `Predicate`
 */
export const predicate = <T>(test: (value: any) => boolean): Predicate<T> =>
  new Predicate(test);

/**
 * Predicate to test whether a value is a number
 */
export const isNumber = predicate<number>((val) => typeof val === "number");
/**
 * Predicate to test whether a value is a string
 */
export const isString = predicate<string>((val) => typeof val === "string");
/**
 * Predicate to test whether a value is a boolean
 */
export const isBoolean = predicate<boolean>((val) => typeof val === "boolean");

// courtesy https://gist.github.com/navix/6c25c15e0a2d3cd0e5bce999e0086fc9
// this one works better for the match cases than the ts-essentials one
/** internal type used to represent deep partials of objects */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly (DeepPartial<U>)[]
    : DeepPartial<T[P]>;
};

/**
 * partially (deep) compare two objects
 * @param me object to compare against
 * @param other partial object to compare with
 * @returns true if `me` matches partially with `other`, i.e. all key/values
 *  of other match with their counterparts in `me`
 * @example
 * partialCompare({a: 3, b: { c: 1}}, {b: {c: 1}}); // true
 * partialCompare({a: 3, b: { c: 1}}, {b: {c: 1, d: 0}}); // false
 */
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

/**
 * Interface for a pattern matcher used in a `match` function
 */
export interface Matcher<T, R> {
  /**
   * function that is executed if this `Matcher` matches
   * @param value the function to execute
   * @returns result of fun
   */
  fun: (value: T) => R | Promise<R>;
  /**
   * @returns does this `Matcher` match
   * @param value the value to test against
   */
  test: (value: any) => boolean;
}

/**
 * create a new `Matcher`
 * @param condition the condition to test for, whether a value is a a catch all,
 *  whether a predicate matches, whether the values are strict equal, whether
 *  two objects match partially, or whether the value is an instance of a class
 * @param fun the function to execute if the `Matcher` matches.
 * @returns a new `Matcher` for this condition and function
 */
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

/**
 * Create a basic `Matcher`.
 * @param condition the condition to test for whether a predicate matches,
 *  whether the values are strict equal, whether two objects match partially,
 *  or whether the value is an instance of a class
 * @param fun the function to execute on match
 */
export const when = <T, R>(
  condition: Predicate<T> | T | DeepPartial<T> | { new (...any: any[]): T },
  fun: (value: T) => R,
): Matcher<T, R> => matcher(condition, fun);

/**
 * Create a `Matcher` that test whether a value is present.
 * @param fun the function to execute on match
 */
export const whenPresent = <T, R>(fun: (value: T) => R): Matcher<T, R> =>
  when<T, R>(predicate<T>((value) => value != null), fun);

/**
 * Create a `Matcher` that test whether a value is a number.
 * @param fun the function to execute on match
 */
export const whenNumber = <R>(fun: (value: number) => R): Matcher<number, R> =>
  when(isNumber, fun);

/**
 * Create a `Matcher` that test whether a value is a string.
 * @param fun the function to execute on match
 */
export const whenString = <R>(fun: (value: string) => R): Matcher<string, R> =>
  when(isString, fun);

/**
 * Create a `Matcher` that test whether a value is a boolean.
 * @param fun the function to execute on match
 */
export const whenBoolean = <T, R>(
  fun: (value: boolean) => R,
): Matcher<boolean, R> => when(isBoolean, fun);

/**
 * Create a catch all `Matcher` that always matches.
 * @param fun the function to execute
 */
export const otherwise = <R>(fun: (value: unknown) => R) =>
  matcher(OtherwiseInstance, fun);

/**
 * Error that is thrown if a `match` construct is not exhaustive.
 * It is advised to always include an `otherwise` branch in `match`es.
 */
export class NoDefaultCaseError extends ExtendRuntimeError(
  "NoDefaultCaseError",
  "no default case in exhaustive match",
) {}

/**
 * Interface of a `match` construct.
 * Takes a value, runs it through its matchers and returns a new value based
 * on matched values.
 */
export interface ValueMatch<R> {
  /* If called with a Promise it will return a Promise */
  <T>(value: Promise<T>, defaultValue?: Promise<R>): Promise<R>;

  /* If called with a value it will return a non async value */
  <T>(value: T, defaultValue?: R): R;
}

// ugly but works, 12 cases enough for now, increase when necessary
// function in order to use arguments
/**
 * Create a new `match` construct by providing multiple `Matcher`s.
 * The `Matcher`s are tested in order and the first matching one's result
 * will be returned.
 * The returned `ValueMatch` can either be called with simple values or with
 * Promises, in which case the result will also be a Promise.
 * @param m1-m12 `Matcher`s to use
 */
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
