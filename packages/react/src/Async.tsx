import React, { useEffect, useState } from "react";
import { typedMemo } from "./utils";

export interface AsyncProps<T> {
  promise: Promise<T>;
  then?: (value: T) => React.ReactNode;
  catch?: (err: unknown) => React.ReactNode;
  children?: React.ReactNode;
}

interface AsyncResult<T> {
  resolved?: T;
  error?: unknown;
}

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
