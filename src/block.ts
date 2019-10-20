import { empty, isOptional, NullError, optional, Optional } from "./optional";
import { RuntimeError } from "./error";
import { isResult, Result } from "./result";

interface PromiscuousJust<PE extends RuntimeError = RuntimeError> {
  <J, E extends PE>(
    value: Result<J, E> | Optional<J> | J | null | undefined,
  ): Promise<J>;
}

export const block = async <T>(
  block: (
    just: PromiscuousJust,
  ) =>
    | Optional<T>
    | Result<T, RuntimeError>
    | T
    | Promise<Optional<T> | Result<T, RuntimeError> | T>,
): Promise<Optional<T>> => {
  const resultJust = async <J, E extends RuntimeError>(
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
  const just: PromiscuousJust = async <J, E extends RuntimeError>(
    value: Optional<J> | Result<J, E> | J | null | undefined,
    defaultValue?: J,
  ): Promise<J> => {
    // we're trusting the typescript compiler here
    if (isResult(value)) {
      return await resultJust(value as Result<J, E>, defaultValue);
    } else if (isOptional(value)) {
      return await optionalJust(value as Optional<J>, defaultValue);
    } else if (value == null) {
      throw new NullError();
    } else {
      return value;
    }
  };
  try {
    const blockResult = await block(just);
    // we're trusting the typescript compiler here
    if (isResult(blockResult)) {
      return (blockResult as Result<T, RuntimeError>).toOptional();
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
