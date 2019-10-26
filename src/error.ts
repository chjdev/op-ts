/**
 * A name tagged runtime error that allows type checking
 * this is necessary because of https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
 */
export abstract class RuntimeError {
  public readonly runtime = "runtime";
  public abstract readonly name: string;
  public abstract readonly message: string;
}

/** safe guard to prevent errors of same name */
const registeredErrors = new Set<string>();

/**
 * Helper function to create new `RuntimeError`s. Prevents you from having
 * to write the error's name twice.
 * @param name the name of this error. Will be used to tag this class.
 * @param defaultMessage an optional message that will be used when not passing
 *  one through the constructor
 *
 * @example
 * export class NullError extends ExtendRuntimeError(
 *   "NullError",
 *   "attempted to access null value",
 * ) {}
 * throw new NullError();
 * //const err: SomeOtherError = new NullError(); // can't be assigned
 *
 * @constructor
 */
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
