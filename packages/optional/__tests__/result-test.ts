/* eslint-disable @typescript-eslint/no-unused-vars */
import { err, NullError, ok, optional, whenErr, whenOk } from "../src";
import { otherwise, when } from "@opresults/match";
import { ExtendRuntimeError } from "@opresults/common";

class C1 {
  public readonly num: number = 3;
}

class C2 extends C1 {}

class C3 {}

class TestError extends ExtendRuntimeError("TestError", "test message") {}

class TestError2 extends ExtendRuntimeError("TestError2", "test message") {}

describe("results test", () => {
  it("it can handle Ok basic results", async () => {
    const val = 3;
    const result = ok<number>(val);

    const standard = result.match(whenOk((val: number) => val * 3));
    await expect(standard.get()).resolves.toBe(val * 3);

    const defaultCase = result.match(otherwise(() => 4));
    await expect(defaultCase.get()).resolves.toBe(4);

    const partialNumberMatch = result.match(
      when(0, () => 10),
      when(3, (val) => val * 3),
      when(5, (val) => val * 5),
      otherwise(() => 0),
    );
    await expect(partialNumberMatch.get()).resolves.toBe(9);

    const predicateNumberMatch = result.match(
      when(0, () => 10),
      when(result.predicate((val) => val === 3), (val) => val * 3),
      when(5, (val) => val * 5),
      otherwise(() => 0),
      result.whenErr(() => -1),
    );
    await expect(predicateNumberMatch.get()).resolves.toBe(9);

    const partialString = "hello";
    const partialStringResult = ok(partialString);
    const partialStringMatch = partialStringResult.match(
      when("hel", (val) => "nil"),
      when("hello", (val) => val.toUpperCase()),
      result.whenErr((err) => "nil"),
      otherwise((val) => "nil"),
    );
    await expect(partialStringMatch.get()).resolves.toBe("HELLO");
  });

  it("it can handle Ok object results", async () => {
    const val = 3;
    const obj = { val, foo: 2, deep: { deeper: { val, foo2: 10 } } };
    const result = ok(obj);

    const standard = result.ok((val) => val.val * 3);
    await expect(standard.get()).resolves.toBe(val * 3);

    const defaultCase = result.match(otherwise((val) => (val as any).val * 4));
    await expect(defaultCase.get()).resolves.toBe(val * 4);

    const partialMatch = result.match(
      when({ val: 5 }, (val: typeof obj) => 0),
      result.whenErr((err) => -1),
      when({ deep: { deeper: { val: 3 } } }, (val: typeof obj) => val.val * 5),
      otherwise((val) => -1),
    );
    await expect(partialMatch.get()).resolves.toBe(val * 5);

    const predicateMatch = result.match(
      when({ val: 5 }, (val: typeof obj) => 0),
      when(
        result.predicate((val) => val.val === 3 && val.foo === 6 / 3),
        (val) => val.val * 5,
      ),
      otherwise((val) => 0),
    );
    await expect(predicateMatch.get()).resolves.toBe(val * 5);
  });

  it("it can handle Ok class results", async () => {
    const result = ok<C1 | C3>(new C2());

    const standard = result.match(
      result.whenOk((val) => (val instanceof C1 ? val.num * 3 : 0)),
      result.whenErr((err) => {
        throw new Error();
      }),
    );
    await expect(standard.get()).resolves.toBe(9);

    const defaultCase = result.match(
      otherwise((val) => (val instanceof C1 ? val.num * 3 : 0)),
    );
    await expect(defaultCase.get()).resolves.toBe(9);

    const partialMatch = result.match(
      when(C3, (val) => 0),
      when(C2, (val) => optional(val.num * 3)),
      when(C1, (val) => val.num * 4),
      otherwise((val) => 0),
    );
    await expect(partialMatch.get()).resolves.toBe(9);

    const partialMatch2 = result.match(
      when(C3, (val) => 0),
      when(C1, (val) => val.num * 4),
      when(C2, (val) => val.num * 3),
      otherwise((val) => 0),
      result.whenErr((err) => -1),
    );
    await expect(partialMatch2.get()).resolves.toBe(12);
  });

  it("handles error results", async () => {
    const result = err<number, TestError>(new TestError());
    await expect(
      result
        .match(
          result.whenErr((err) => 3),
          otherwise((val) => {
            console.log(val);
            return -1;
          }),
        )
        .get(),
    ).resolves.toBe(3);
    await expect(
      result.match(whenErr((err) => 3), otherwise(() => -1)).get(),
    ).resolves.toBe(3);
    await expect(result.get()).rejects.toBeInstanceOf(TestError);
    await expect(result.get(2)).resolves.toBe(2);
  });

  it("handles quick paths", async () => {
    const resultOk = ok<number, TestError>(1);
    await expect(resultOk.ok((val) => val + 1).get()).resolves.toBe(2);
    await expect(resultOk.err((val) => {})).resolves.toBeUndefined();

    const resultErr = err<number, TestError>(new TestError());
    await expect(resultErr.ok((val) => val + 1).get()).rejects.toBeInstanceOf(
      NullError,
    );
    await expect(resultErr.err((val) => {})).resolves.toBeUndefined();
  });

  it("handles mapOk mapErr", async () => {
    const resultOk = ok<number, TestError>(1);
    await expect(
      resultOk.mapOk((val): string => val + "hello").get(),
    ).resolves.toBe("1hello");
    await expect(
      resultOk.mapErr((err) => new TestError2()).get(),
    ).resolves.toBe(1);

    const resultErr = err<number, TestError>(new TestError());
    await expect(
      resultErr.mapOk((val): string => val + "hello").get(),
    ).rejects.toBeInstanceOf(TestError);
    await expect(
      resultErr.mapErr((err) => new TestError2()).get(),
    ).rejects.toBeInstanceOf(TestError2);
  });
});
