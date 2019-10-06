import { empty, isOptional, NullError, optional, Optional } from "./optional";
import { err, isResult, ok, Result } from "./result";

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
    value: Optional<J> | Result<J, E>,
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
