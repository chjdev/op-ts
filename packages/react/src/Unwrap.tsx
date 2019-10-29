import React from "react";
import { Async } from "./Async";
import { Optional } from "@opresults/optional";
import { typedMemo } from "./utils";

export interface UnwrapProps<T> {
  optional: Optional<T>;
  default?: T;
  present?: (value: T) => React.ReactNode;
  otherwise?: () => React.ReactNode;
  children?: React.ReactNode;
}

export const Unwrap = typedMemo(
  <T,>({
    optional,
    default: _default,
    present,
    otherwise,
    children,
  }: Readonly<UnwrapProps<T>>) => (
    <Async
      promise={optional.get(_default)}
      then={present ? (value: T): React.ReactNode => present(value) : undefined}
      catch={otherwise ? () => otherwise() : undefined}
    >
      {children}
    </Async>
  ),
);

type ConvertOptional<T extends object, K extends keyof T> = {
  [P in keyof T]: P extends K ? Optional<T[P]> : T[P];
};

type CheckNotOptional<T extends object, K extends keyof T> = {
  [P in keyof T]: P extends K
    ? (T[P] extends Optional<any> ? never : T[P])
    : T[P];
};

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
