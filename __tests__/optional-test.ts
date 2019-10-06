/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  empty,
  err,
  isOptional,
  match,
  ok,
  optional,
  otherwise,
  predicate,
  when,
  whenErr,
  whenNumber,
  Optional,
  whenOk,
} from "../src/optional";

describe("optional test cases", () => {
  it("can extract optionals", async () => {
    const val = 3;
    const opt = optional(val);
    // map without resolution
    expect(() => empty<number>().map(() => 3)).not.toThrow();
    //should be throw on empty map
    await expect(
      empty<number>()
        .map(() => 3)
        .get(),
    ).rejects.toThrow();
    test("type guard should recognize optionals", () => {
      expect(isOptional(opt)).toBeTruthy();
      expect(isOptional(empty())).toBeTruthy();
      expect(isOptional(optional(null)));
    });
    assert.strictEqual(
      await opt.get(),
      val,
      "optional wrapped value should be the same",
    );
    assert(
      (await opt.match(when(2, () => -1), when(3, (val) => val * 3)).get()) ===
        val * 3,
      "allows matching",
    );
    assert(
      (await opt
        .match(when(2, () => -1), when(1, (val) => val * 3), otherwise(() => 3))
        .get()) === 3,
      "allows matching with default",
    );
  });

  it("can work with filled optionals in normal mode", async () => {
    const val = 3;
    const opt = optional(val);
    // non async mode
    assert.strictEqual(
      await opt.map((val) => val * 2).get(),
      val * 2,
      "optional mapped value is incorrect",
    );
    let forEachValNormal = 0;
    await opt.forEach((val) => {
      forEachValNormal = val * 2;
    });
    assert.strictEqual(
      forEachValNormal,
      val * 2,
      "optional forEach should execute",
    );
    assert.strictEqual(
      await opt.reduce((acc, val) => acc + val, val).get(),
      val * 2,
      "optional reduced value is incorrect",
    );
  });

  it("can work with filled optionals in async mode", async () => {
    const val = 3;
    const opt = optional(val);
    // async mode
    assert.strictEqual(
      await opt.map(async (val) => val * 2).get(),
      val * 2,
      "optional mapped value is incorrect",
    );
    let forEachVal = 0;
    await opt.forEach((val) => {
      forEachVal = val * 2;
    });
    assert.strictEqual(forEachVal, val * 2, "optional forEach should execute");
    assert.strictEqual(
      await opt.reduce(async (acc, val) => acc + val, val).get(),
      val * 2,
      "optional reduced value is incorrect",
    );
  });

  it("can handle unfilled optionals", async () => {
    const opt: Optional<number> = optional(Promise.reject());
    await assert.rejects(
      async () => await opt.get(),
      "optional should throw on null",
    );
    // todo check the map etc.
    const mappedNull = opt.map((val) => val * 2).map((val) => val * 3);
    await assert.rejects(
      async () => await mappedNull.get(),
      "optional should allow code flow but reject 1",
    );
    const reducedNull = opt.reduce(async (acc, val) => {
      return acc + val;
    }, 3);
    await assert.rejects(
      async () => await reducedNull.get(),
      "optional should allow code flow but reject 2",
    );
    let forEachVal = 0;
    await opt.forEach(() => {
      forEachVal += 1;
    });
    assert.strictEqual(forEachVal, 0, "should not run");
  });
});

class C1 {
  public readonly num: number = 3;
}

class C2 extends C1 {}

class C3 {}

class TestError extends Error {
  public readonly name: string = "TestError";
  public readonly message: string = "test message";
}

describe("results test", () => {
  it("it can handle Ok basic results", async () => {
    const val = 3;
    const result = ok<number>(val);

    const standard = result.match(whenOk((val: number) => val * 3));
    assert.strictEqual(
      await standard.get(),
      val * 3,
      "should match the ok path",
    );

    const defaultCase = result.match(otherwise(() => 4));
    assert.strictEqual(
      await defaultCase.get(),
      4,
      "should match the default ok path",
    );

    const partialNumberMatch = result.match(
      when(0, () => 10),
      when(3, (val) => val * 3),
      when(5, (val) => val * 5),
      otherwise(() => 0),
    );
    assert.strictEqual(
      await partialNumberMatch.get(),
      9,
      "should match the partially matched ok path",
    );

    const predicateNumberMatch = result.match(
      when(0, () => 10),
      when(result.predicateOk((val) => val === 3), (val) => val * 3),
      when(5, (val) => val * 5),
      otherwise(() => 0),
      result.whenErr(() => -1),
    );
    assert.strictEqual(
      await predicateNumberMatch.get(),
      9,
      "should match the partially matched ok path",
    );

    const partialString = "hello";
    const partialStringResult = ok(partialString);
    const partialStringMatch = partialStringResult.match(
      when("hel", (val) => "nil"),
      when("hello", (val) => val.toUpperCase()),
      result.whenErr((err) => "nil"),
      otherwise((val) => "nil"),
    );
    assert.strictEqual(
      await partialStringMatch.get(),
      "HELLO",
      "should match the partially matched ok path",
    );
  });
  it("it can handle Ok object results", async () => {
    const val = 3;
    const obj = { val, foo: 2, deep: { deeper: { val, foo2: 10 } } };
    const result = ok(obj);

    const standard = result.ok((val) => val.val * 3);
    assert.strictEqual(
      await standard.get(),
      val * 3,
      "should match the ok path",
    );

    const defaultCase = result.match(otherwise((val) => (val as any).val * 4));
    assert.strictEqual(
      await defaultCase.get(),
      val * 4,
      "should match the default ok path",
    );

    const partialMatch = result.match(
      when({ val: 5 }, (val: typeof obj) => 0),
      result.whenErr((err) => -1),
      when({ deep: { deeper: { val: 3 } } }, (val: typeof obj) => val.val * 5),
      otherwise((val) => -1),
    );
    assert.strictEqual(
      await partialMatch.get(),
      val * 5,
      "should match the partially matched ok path",
    );

    const predicateMatch = result.match(
      when({ val: 5 }, (val: typeof obj) => 0),
      when(
        result.predicateOk((val) => val.val === 3 && val.foo === 6 / 3),
        (val) => val.val * 5,
      ),
      otherwise((val) => 0),
    );
    assert.strictEqual(
      await predicateMatch.get(),
      val * 5,
      "should match the partially matched ok path",
    );
  });
  it("it can handle Ok class results", async () => {
    const result = ok<C1 | C3>(new C2());

    const standard = result.match(
      result.whenOk((val) => (val instanceof C1 ? val.num * 3 : 0)),
      result.whenErr((err) => {
        throw new Error();
      }),
    );
    assert.strictEqual(await standard.get(), 9, "should match the ok path");

    const defaultCase = result.match(
      otherwise((val) => (val instanceof C1 ? val.num * 3 : 0)),
    );
    assert.strictEqual(
      await defaultCase.get(),
      9,
      "should match the default ok path",
    );

    const partialMatch = result.match(
      when(C3, (val) => 0),
      when(C2, (val) => optional(val.num * 3)),
      when(C1, (val) => val.num * 4),
      otherwise((val) => 0),
    );
    assert.strictEqual(
      await partialMatch.get(),
      9,
      "should match the partially matched ok path",
    );

    const partialMatch2 = result.match(
      when(C3, (val) => 0),
      when(C1, (val) => val.num * 4),
      when(C2, (val) => val.num * 3),
      otherwise((val) => 0),
      result.whenErr((err) => -1),
    );
    assert.strictEqual(
      await partialMatch2.get(),
      12,
      "should match the partially matched ok path",
    );
  });
  it("handles some specialized matching", async () => {
    const optNum = optional(3);
    assert(
      (await optNum.map(match(otherwise(async () => optional(4)))).get()) === 4,
      "works with only default case",
    );
    assert(
      match(whenNumber(() => 5), otherwise(() => 3))(4) === 5,
      "works with normal numbers",
    );
    assert(
      match(when(1, () => -1), when(2, () => -1))(3, 5) === 5,
      "works with default values instead of otherwise",
    );
    assert(
      match(
        when(predicate((val) => val === -1), () => -1),
        when(4, () => 5),
        otherwise(() => 3),
      )(4) === 5,
      "works with normal numbers",
    );
    assert(
      (await optional(4)
        .match(when(4, () => 5), otherwise(() => 3))
        .get()) === 5,
      "works with a filled optional",
    );
    assert(
      (await empty()
        .match(when(4, () => 5), otherwise(() => 2))
        .get()) === 2,
      "works on empty with default case",
    );
  });
  it("handles error results", async () => {
    const result = err<number, TestError>(new TestError());
    assert(
      (await result
        .match(result.whenErr((err) => 3), otherwise(() => -1))
        .get()) === 3,
      "finds the error path",
    );
    assert(
      (await result.match(whenErr((err) => 3), otherwise(() => -1)).get()) ===
        3,
      "finds the error path",
    );
    await assert.rejects(() => result.get(), "throws an error");
    try {
      await result.get();
    } catch (err) {
      assert(err instanceof TestError, "throws the correct error");
    }
    assert((await result.get(2)) === 2, "returns a default value");
  });
});
