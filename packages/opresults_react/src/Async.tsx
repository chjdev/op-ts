import React, { useEffect, useState } from "react";
import { typedMemo } from "./utils";

/** internal interface for resolved promise */
interface AsyncResult<T> {
  resolved?: T;
  error?: unknown;
}

export interface AsyncProps<T> {
  /** the Promise to resolve */
  promise: Promise<T>;
  /**
   * called when when the Promise resolves
   * @param value resolved value
   */
  then?: (value: T) => React.ReactNode;
  /**
   * called when when the Promise rejects
   * @param err the rejected value if present. In TypeScript reject reasons
   *  are of type `any`
   */
  catch?: (err: unknown) => React.ReactNode;
  /**
   * React Node to use while there is no result present or if one of the paths
   * is undefined.
   * @example
   * <Async
   *   promise={Promise.reject()}
   *   catch={() => "not ok"}
   * >
   * everything ok
   * </Async>
   */
  children?: React.ReactNode;
}

/**
 * Component that resolves a promise and allows rendering based on its results.
 * Different combinations of `then`, `children` and `catch` can achieve different
 * behaviours.
 *
 * Generally `then` renders when the Promise resolved successfully and `catch`
 * if the Promise rejects. `children` is rendered as placeholder while no
 * result exists, or in the absence of a path.
 *
 * @example
 * <Async
 *   promise={Promise.resolve("hello")}
 *   then={(value) => value}
 *   catch={() => "caught"}
 * >
 * loading
 * </Async>
 * // renders "loading" while resolving the promise and "hello" if the promise
 * // resolves, and "caught" in case of an error.
 * // Any path can be omitted to default to `children` (or nothing).
 */
export const Async = typedMemo(<T,>(props: AsyncProps<T>) => {
  const { promise, then, catch: _catch, children } = props;
  const [result, setResult] = useState<AsyncResult<T>>({});
  useEffect(() => {
    // prevent warning when component unmounts
    let didCancel = false;
    const safeSetResult = (result: AsyncResult<T>) => {
      didCancel || setResult(result);
    };
    promise
      .then((resolved) => safeSetResult({ resolved }))
      .catch((error) => safeSetResult({ error }));
    return () => {
      didCancel = true;
    };
  }, [promise]);
  const { resolved, error } = result;
  let rendered = children;
  if (error) {
    if (_catch) {
      rendered = _catch(error);
    }
  } else if (resolved) {
    if (then) {
      rendered = then(resolved);
    }
  }
  return <>{rendered}</>;
});
