import { empty, isOptional, NullError, optional, Optional } from "./optional";
import { RuntimeError } from "./error";
import { isResult, Result } from "./result";

/**
 * Interface for a function that can be called with either a `Result` or an
 * `Optional` and resolves it to it's filled value or terminates the block
 * execution.
 */
interface PromiscuousJust<PE extends RuntimeError = RuntimeError> {
  /**
   * path that resolves a `Result` to its value
   * @param value the `Result` to resolve
   * @param defaultValue an optional default value
   */
  <J, E extends PE>(value: Result<J, E>, defaultValue?: J): Promise<J>;
  /**
   * path that resolves an `Optional` to its value
   * @param value the `Optional` to resolve
   * @param defaultValue an optional default value
   */
  <J>(value: Optional<J> | J | null | undefined, defaultValue?: J): Promise<J>;
}

/**
 * Create an execution block that results in an `Optional`.
 * This allows a more streamlined/linear approach to working with optionals,
 * where instead of having to chain transducers one can resolve the value
 * on the spot, terminating the block if the optional is unfilled.
 *
 * @param block the execution block taking a single parameter `just` which can
 *  be used to resolve an `Optional`'s (or `Result`'s) value.
 * @returns an `Optional` representing the result of the block execution
 *
 * @example
 * const opt: Optional<string> = await block(async (just) => {
 *    const a: number = await just(valA);
 *    const b: string = await just(valB);
 *    const c: number = await just(valD);
 *    return b + ":" + a * c;
 *  });
 */
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
