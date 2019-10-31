import React from "react";
import { Async } from "./Async";
import { Optional } from "@opresults/optional";
import { typedMemo } from "./utils";

export interface UnwrapProps<T> {
  /** the `Optional` to unwrap */
  optional: Optional<T>;
  /**
   * an optional default value to use for the `Optional`. This will cause
   * Unwrap to always render the `present` path (after the first render, i.e.
   * after unwrapping concluded)
   */
  default?: T;
  /**
   * called if a value is present in the `Optional`
   * @param value the unwrapped value
   */
  present?: (value: T) => React.ReactNode;
  /**
   * called if no value is present in the `Optional`
   */
  otherwise?: () => React.ReactNode;
  /**
   * React Node to use while unwrapping is ongoing or if one of the paths
   * is undefined.
   * @example
   * <Unwrap
   *   optional={optional(2)}
   *   present={() => "definitely a value"}
   * >
   * "no value"
   * </Unwrap>
   */
  children?: React.ReactNode;
}

/**
 * Component to render `Optionals`.
 * Different combinations of `present`, `otherwise` and `children` can be used
 * to achieve different behaviours, quite similar to @see `Async`
 *
 * Specifically:
 *  * `present` maps to `then`
 *  * `otherwise` maps to `catch`
 *  * and `children` to `children`
 *
 * @example
 * const opt = optional("hello");
 * <Unwrap optional={opt} present={(value) => value} otherwise={() => "nil"}>
 * loading
 * </Unwrap>
 * // renders "loading" while waiting for the `Optional` to unwrap, "hello"
 * // once the `Optional` unwraps and would render "nil" if the `Optional` is
 * // empty. Any path can be omitted to default to `children` (or nothing).
 */
export const Unwrap = typedMemo(
  <T,>({
    optional,
    default: _default,
    present,
    otherwise,
    children,
  }: Readonly<UnwrapProps<T>>) => (
    <Async promise={optional.get(_default)} then={present} catch={otherwise}>
      {children}
    </Async>
  ),
);

/** internal type to convert a key of props object to its `Optional` version */
type ConvertOptional<T extends object, K extends keyof T> = {
  [P in keyof T]: P extends K ? Optional<T[P]> : T[P];
};

/**
 * internal type to check that a key of a props is not an `Optional` .
 * Is used in combination with `ConvertOptional` to transform a non `Optional`
 * prop into an `Optional` one.
 */
type CheckNotOptional<T extends object, K extends keyof T> = {
  [P in keyof T]: P extends K
    ? (T[P] extends Optional<any> ? never : T[P])
    : T[P];
};

/**
 * A HOC that wraps a non `Optional` prop of a Component into its `Optional`
 * version.
 * @param prop the key of the prop to wrap, must reference a non `Optional`
 *  prop type
 * @param Component the Component to wrap
 * @param Otherwise an optional Component to use to render an unfilled `Optional`
 * @param def an optional default value to use to unwrap the `Optional`.
 *  (Specifying a value here renders the `Otherwise` param superfluous.)
 * @param loading a ReactNode to use while the Optional is unwrapping. Or as
 *  a catch all path if other paths are omitted @see `children` of `Unwrap`.
 * @returns a Component with the specified prop replaced by its `Optional` version
 */
export const withOptional = <P extends object, K extends keyof P>(
  prop: K,
  Component: React.ComponentType<CheckNotOptional<P, K>>,
  {
    def,
    Otherwise,
    loading,
  }: {
    Otherwise?: React.ComponentType<Omit<P, K>>;
    def?: P[K];
    loading?: React.ReactNode;
  } = {},
): React.ComponentType<ConvertOptional<P, K>> =>
  typedMemo((props: ConvertOptional<P, K>) => {
    const option = props[prop] as Optional<P[K]>;
    const omitProps: Omit<ConvertOptional<P, K>, K> = {
      ...props,
      [prop as K]: undefined,
    };
    return (
      <Unwrap
        optional={option}
        default={def}
        present={(value) => {
          const convertedProps = {
            ...omitProps,
            [prop]: value,
          };
          return (
            <Component
              {...((convertedProps as unknown) as CheckNotOptional<P, K>)}
            />
          );
        }}
        otherwise={
          Otherwise != null
            ? () => <Otherwise {...(omitProps as Omit<P, K>)} />
            : undefined
        }
      >
        {loading}
      </Unwrap>
    );
  });
