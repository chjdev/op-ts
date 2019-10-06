import {
  _OptionalImpl,
  _toPromise,
  isOptional,
  optional,
  Optional,
  OptionalTransducer,
  OptionalTransducerResult,
  peel,
} from "./optional";
import { Matcher, otherwise, Predicate, predicate, when } from "./match";

export interface Result<T, E extends Error> extends Optional<T | E> {
  whenOk<R>(
    fun: OptionalTransducer<T, R>,
  ): Matcher<T, OptionalTransducerResult<R>>;

  ok<R>(fun: OptionalTransducer<T, R>): Optional<R>;

  mapOk<R>(mapper: OptionalTransducer<T, R>, defaultValue?: T): Result<R, E>;

  whenErr<R>(
    fun: OptionalTransducer<E, R>,
  ): Matcher<E, OptionalTransducerResult<R>>;

  err<R>(fun: OptionalTransducer<E, R>): Promise<void>;

  mapErr<R extends Error>(
    mapper: OptionalTransducer<E, R>,
    defaultValue?: E,
  ): Result<T, R>;

  printErr(): Promise<void>;
  toOptional(defaultValue?: T): Optional<T>;
}

export const isResult = (value: any): value is Result<any, Error> => {
  const optValue = value; //for typescript
  return (
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    value instanceof _ResultImpl ||
    (isOptional(optValue) &&
      typeof value.ok === "function" &&
      typeof value.err === "function" &&
      typeof value.mapOk === "function" &&
      typeof value.mapErr === "function" &&
      typeof value.whenOk === "function" &&
      typeof value.whenErr === "function" &&
      typeof value.printErr === "function" &&
      typeof value.toOptional === "function")
  );
};

export const result = <T, E extends Error>(
  value: T | null | undefined | E | Promise<T | E | null | undefined>,
): Result<T, E> => {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new _ResultImpl<T, E>(_toPromise<T | E>(value));
};

export const ok = <T, E extends Error = Error>(
  value: T | Promise<T>,
): Result<T, E> => result<T, E>(value);

export const err = <T, E extends Error>(value: E): Result<T, E> =>
  result<T, E>(value);

export const fromOptional = <T, E extends Error>(
  opt: Optional<T | E>,
): Result<T, E> => {
  return result<T, E>(opt.get());
};

export const whenOk = <T, R>(fun: (value: T) => R): Matcher<T, R> =>
  when<T, R>(predicate<T>((value) => !(value instanceof Error)), fun);

export const whenErr = <E extends Error, R>(
  fun: (value: E) => R,
): Matcher<E, R> =>
  when<E, R>(predicate<E>((val) => val instanceof Error), fun);

// eslint-disable-next-line @typescript-eslint/class-name-casing
export class _ResultImpl<T, E extends Error = Error> extends _OptionalImpl<
  T | E
> {
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
    return fromOptional<R, E>(
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
    return fromOptional<T, R>(
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

  public toOptional(defaultValue?: T): Optional<T> {
    return this.match(
      this.whenOk((value) => value),
      this.whenErr(() => optional(defaultValue)),
    );
  }
}
