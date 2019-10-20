// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
/** A name tagged runtime error that allows type checking */
export abstract class RuntimeError {
  public readonly runtime = "runtime";
  public abstract readonly name: string;
  public abstract readonly message: string;
}

const registeredErrors = new Set<string>();

export const ExtendRuntimeError = <N extends string>(
  name: N,
  defaultMessage: string = "",
) => {
  if (registeredErrors.has(name)) {
    throw new Error("RuntimeError extensions require unique names!");
  }
  registeredErrors.add(name);
  return class E extends RuntimeError {
    public readonly name: N = name;
    public constructor(public readonly message: string = defaultMessage) {
      super();
    }
  };
};
