/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  empty,
  isOptional,
  NullError,
  Optional,
  optional,
  ValueMovedError,
} from "../src/optional";
import { otherwise, when, whenPresent } from "../src/match";

describe("optional test cases", () => {
  it("can extract optionals", async () => {
    const val = 3;
    const opt = optional(val);

    await expect(opt.get()).resolves.toBe(val);

    expect(isOptional(opt)).toBeTruthy();
    expect(isOptional(empty())).toBeTruthy();
    expect(isOptional(optional(null)));
  });

  it("can match filled optionals", async () => {
    const val = 3;
    const opt = optional(val);

    await expect(
      opt.match(whenPresent(() => 11), otherwise(() => -1)).get(),
    ).resolves.toBe(11);

    await expect(
      opt
        .match(when(2, () => -1), when(3, (val) => Promise.resolve(val * 3)))
        .get(),
    ).resolves.toBe(val * 3);

    await expect(
      opt
        .match(
          when(2, () => -1),
          when(1, (val) => optional(val * 3)),
          otherwise(() => 3),
        )
        .get(),
    ).resolves.toBe(3);
  });

  it("can match empty optionals", async () => {
    const opt = empty<number>();

    await expect(
      opt.match(whenPresent(() => 11), otherwise(() => -1)).get(),
    ).resolves.toBe(-1);

    await expect(
      opt.match(when(2, () => -1), otherwise(() => Promise.resolve(11))).get(),
    ).resolves.toBe(11);
  });

  it("can work with filled optionals in normal mode", async () => {
    const val = 3;
    const opt = optional(val);
    await expect(opt.map((val) => val * 2).get()).resolves.toBe(val * 2);
    let forEachValNormal = 0;
    await opt.forEach((val) => {
      forEachValNormal = val * 2;
    });
    expect(forEachValNormal).toBe(val * 2);
    await expect(opt.reduce((acc, val) => acc + val, val).get()).resolves.toBe(
      val * 2,
    );
  });

  it("can work with filled optionals in async mode", async () => {
    const val = 3;
    const opt = optional(val);
    await expect(opt.map(async (val) => val * 2).get()).resolves.toBe(val * 2);
    let forEachVal = 0;
    await opt.forEach((val) => {
      forEachVal = val * 2;
    });
    expect(forEachVal).toBe(val * 2);
    await expect(
      opt.reduce(async (acc, val) => acc + val, val).get(),
    ).resolves.toBe(val * 2);
  });

  it("allows control flows with unfilled optionals", async () => {
    expect(() => empty<number>().forEach(() => {})).not.toThrow();
    await expect(
      empty<number>()
        .map(() => 3)
        .get(),
    ).rejects.toBeInstanceOf(NullError);

    const opt: Optional<number> = optional(Promise.reject());
    await expect(opt.otherwise(() => 4).get()).resolves.toBe(4);
    await expect(opt.coalesce(() => 4).get()).resolves.toBe(4);
    await expect(
      opt
        .coalesce(() => 4)
        .coalesce(() => 5)
        .get(),
    ).resolves.toBe(4);
    await expect(opt.get()).rejects.toBeInstanceOf(NullError);
    const mappedNull = opt.map((val) => val * 2).map((val) => val * 3);
    await expect(mappedNull.get()).rejects.toBeInstanceOf(NullError);
    const reducedNull = opt.reduce(async (acc, val) => {
      return acc + val;
    }, 3);
    await expect(reducedNull.get()).rejects.toBeInstanceOf(NullError);
    let forEachVal = 0;
    await opt.forEach(() => {
      forEachVal += 1;
    });
    expect(forEachVal).toBe(0);
  });

  it("allows move semantics", async () => {
    const gobbler = () => {};
    let a = optional(3);
    a = a.move(gobbler);
    await expect(a.get()).rejects.toBeInstanceOf(ValueMovedError);
    await expect(a.move(gobbler).get()).rejects.toBeInstanceOf(ValueMovedError);
    await expect(a.map(() => -1).get()).rejects.toBeInstanceOf(ValueMovedError);
  });
});
