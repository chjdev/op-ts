import {
  _OptionalImpl,
  isOptional,
  optional,
  Optional,
  OptionalTransducer,
  OptionalTransducerResult,
  _toPromise,
} from "./optional";
import {
  Matcher,
  otherwise,
  Predicate,
  predicate,
  when,
} from "@opresults/match";
import { RuntimeError } from "@opresults/common";

/**
 * `Result`s are extended versions of `Optional`s that provided methods
 * to distinguish valid values from errors.
 * They can be viewed as an `Optional<T | E extends RuntimeError>` with
 * additional convenience methods, i.e. is they potentially hold a value of
 * T or a value representing an error.
 *
 * @example
 * const apiResult: Result<JSON, HTTPError | AuthError> = await callApi(...);
 * apiResult.printErr();
 * apiResult.match(
 *  when(ApiError, (err) => fixApiError(err.message)),
 *  when(AuthError, beMad),
 *  apiResult.whenOk(dispatch);
 * );
 * return apiResult.mapOk((value) => value.a + 1).toOptional();
 */
export interface Result<T, E extends RuntimeError = RuntimeError>
  extends Optional<T | E> {
  /**
   * Typed pattern matcher for the OK path of this `Result`
   * @param fun function to execute if there is an OK value
   * @returns pattern matcher
   */
  whenOk<R>(
    fun: OptionalTransducer<T, R>,
  ): Matcher<T, OptionalTransducerResult<R>>;

  /**
   * Transform this OK path of this `Result` into an `Optional` using a mapping function
   * @param fun mapping function
   * @returns an `Optional` of the mapped result
   */
  ok<R>(fun: OptionalTransducer<T, R>): Optional<R>;

  /**
   * Maps the OK path of this result into a new `Result` of the return type and
   * the original error type
   * @param mapper mapping function
   * @returns a `Result` of the mapped OK type
   */
  mapOk<R>(mapper: OptionalTransducer<T, R>): Result<R, E>;

  /**
   * Typed pattern matcher for the Error path of this `Result`
   * @param fun function to execute if there is an Error value
   * @returns pattern matcher
   */
  whenErr<R>(
    fun: OptionalTransducer<E, R>,
  ): Matcher<E, OptionalTransducerResult<R>>;

  /**
   * Runs a function in case there is an error path
   * @param fun function taking the error
   */
  err(fun: OptionalTransducer<E, void>): Promise<void>;

  /**
   * Maps the Error path of this `Result` into a new `Result` of the return type
   * and the original error type
   * @param mapper mapping function
   * @returns a `Result` of the mapped OK type
   */
  mapErr<R extends RuntimeError>(
    mapper: OptionalTransducer<E, R>,
  ): Result<T, R>;

  /**
   * Typed pattern predicate for the OK path of this `Result`
   * @param test predicate
   * @returns a pattern predicate
   */
  predicate(test: (value: T) => boolean): Predicate<T>;

  /**
   * Print the Error paht to console.error if there is one
   */
  printErr(): Promise<void>;

  /**
   * Convert this `Result` to an `Optional` disregarding potential Error paths
   * @param defaultValue a default value to use for the new `Optional`
   * @returns an `Optional` of the OK path
   */
  toOptional(defaultValue?: T): Optional<T>;
}

/**
 * type guard to check whether a value is a `Result`.
 * @param value the value to check
 * @returns value is a `Result`
 */
export const isResult = (
  value: any,
): value is Result<unknown, RuntimeError> => {
  const optValue = value; //for typescript
  return (
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    isOptional(optValue) && value instanceof _ResultImpl
  );
};

/**
 * Creates a new `Result` from an optional value, error or a promise
 * @param value an optional value of ?T, an error of E or a Promise<?T | E>
 * @returns `Result` wrapped value
 */
export const result = <T, E extends RuntimeError>(
  value: T | null | undefined | E | Promise<T | E | null | undefined>,
): Result<T, E> => {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new _ResultImpl<T, E>(_toPromise<T | E>(value));
};

/**
 * @returns an OK `Result` of T
 * @param value the OK value
 */
export const ok = <T, E extends RuntimeError = RuntimeError>(
  value: T | Promise<T>,
): Result<T, E> => result<T, E>(value);

/**
 * @returns an Error `Result` of E
 * @param value the Error
 */
export const err = <T, E extends RuntimeError>(value: E): Result<T, E> =>
  result<T, E>(value);

/**
 * Convert an `Optional` to a `Result`
 * @param opt the `Optional` to convert
 * @returns a `Result`
 */
export const fromOptional = <T, E extends RuntimeError>(
  opt: Optional<T | E>,
): Result<T, E> => {
  return result<T, E>(opt.get());
};

/**
 * @returns Pattern matcher for Ok paths of `Results`
 * @param fun function to execute
 */
export const whenOk = <T, R>(fun: (value: T) => R): Matcher<T, R> =>
  when<T, R>(predicate<T>((value) => !(value instanceof RuntimeError)), fun);

/**
 * @returns Pattern matcher for Error paths of `Results`
 * @param fun function to execute
 */
export const whenErr = <E extends RuntimeError, R>(
  fun: (value: E) => R,
): Matcher<E, R> =>
  when<E, R>(predicate<E>((val) => val instanceof RuntimeError), fun);

// eslint-disable-next-line @typescript-eslint/class-name-casing
export class _ResultImpl<
  T,
  E extends RuntimeError = RuntimeError
> extends _OptionalImpl<T | E> {
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
    return this.mapOk(fun).toOptional();
  }

  public mapOk<R>(mapper: OptionalTransducer<T, R>): Result<R, E> {
    return fromOptional<R, E>(
      this.match(this.whenOk(mapper), this.whenErr((err): R | E => err)),
    );
  }

  public predicate(test: (value: T) => boolean): Predicate<T> {
    return predicate(
      (value: T) => !(value instanceof RuntimeError) && test(value),
    );
  }

  public whenErr<R>(
    fun: OptionalTransducer<E, R>,
  ): Matcher<E, OptionalTransducerResult<R>> {
    return whenErr(fun);
  }

  public async err(fun: OptionalTransducer<E, void>): Promise<void> {
    await this.match(this.whenErr(fun), otherwise(() => {})).unwrap();
  }

  public mapErr<R extends RuntimeError>(
    mapper: OptionalTransducer<E, R>,
  ): Result<T, R> {
    return fromOptional<T, R>(
      this.match(this.whenOk((val): T | R => val), this.whenErr(mapper)),
    );
  }

  public printErr(): Promise<void> {
    return this.err(console.error);
  }

  public toOptional(defaultValue?: T): Optional<T> {
    return this.match(
      this.whenOk((value) => value),
      this.whenErr(() => optional(defaultValue)),
    );
  }
}
