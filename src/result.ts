import {
  _OptionalImpl,
  isOptional,
  optional,
  Optional,
  OptionalTransducer,
  OptionalTransducerResult,
  toPromise,
} from "./optional";
import { Matcher, otherwise, Predicate, predicate, when } from "./match";
import { RuntimeError } from "./error";

export interface Result<T, E extends RuntimeError = RuntimeError>
  extends Optional<T | E> {
  whenOk<R>(
    fun: OptionalTransducer<T, R>,
  ): Matcher<T, OptionalTransducerResult<R>>;

  ok<R>(fun: OptionalTransducer<T, R>): Optional<R>;

  mapOk<R>(mapper: OptionalTransducer<T, R>): Result<R, E>;

  predicate(test: (value: T) => boolean): Predicate<T>;

  whenErr<R>(
    fun: OptionalTransducer<E, R>,
  ): Matcher<E, OptionalTransducerResult<R>>;

  err(fun: OptionalTransducer<E, void>): Promise<void>;

  mapErr<R extends RuntimeError>(
    mapper: OptionalTransducer<E, R>,
  ): Result<T, R>;

  printErr(): Promise<void>;

  toOptional(defaultValue?: T): Optional<T>;
}

export const isResult = (
  value: any,
): value is Result<unknown, RuntimeError> => {
  const optValue = value; //for typescript
  return (
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    isOptional(optValue) && value instanceof _ResultImpl
  );
};

export const result = <T, E extends RuntimeError>(
  value: T | null | undefined | E | Promise<T | E | null | undefined>,
): Result<T, E> => {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new _ResultImpl<T, E>(toPromise<T | E>(value));
};

export const ok = <T, E extends RuntimeError = RuntimeError>(
  value: T | Promise<T>,
): Result<T, E> => result<T, E>(value);

export const err = <T, E extends RuntimeError>(value: E): Result<T, E> =>
  result<T, E>(value);

export const fromOptional = <T, E extends RuntimeError>(
  opt: Optional<T | E>,
): Result<T, E> => {
  return result<T, E>(opt.get());
};

export const whenOk = <T, R>(fun: (value: T) => R): Matcher<T, R> =>
  when<T, R>(predicate<T>((value) => !(value instanceof RuntimeError)), fun);

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
