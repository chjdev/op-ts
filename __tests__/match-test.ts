import {
  match,
  NoDefaultCaseError,
  otherwise,
  predicate,
  ValueMatch,
  when,
  whenBoolean,
  whenNumber,
  whenPresent,
  whenString,
} from "../src/match";

const expectMatch = async <T, R>(
  matcher: ValueMatch<R>,
  value: T,
  expected: R,
  defaultValue?: R,
) => {
  expect(matcher(value, defaultValue)).toBe(expected);
  await expect(matcher(Promise.resolve(value), defaultValue)).resolves.toBe(
    expected,
  );
  await expect(
    matcher(
      Promise.resolve(value),
      defaultValue ? Promise.resolve(defaultValue) : undefined,
    ),
  ).resolves.toBe(expected);
  await expect(matcher(Promise.reject("reason"))).rejects.toBe("reason");
};

class C1 {
  public readonly num: number = 3;
}

class C2 extends C1 {}

class C3 {
  public readonly message: string = "hello";
}

describe("test error base class", () => {
  it("matches booleans", async () => {
    const matcher = match(
      when(true, () => 1),
      when(false, () => 2),
      otherwise(() => -1),
    );
    await expectMatch(matcher, true, 1);
    await expectMatch(matcher, false, 2);
    await expectMatch(matcher, 3, -1);
    await expectMatch(matcher, "string", -1);
  });

  it("fall through booleans", async () => {
    const matcher = match(when(true, () => 1));
    await expectMatch(matcher, true, 1);
    await expectMatch(matcher, false, 2, 2);
    expect(() => matcher(false)).toThrow(NoDefaultCaseError);
    await expect(matcher(Promise.resolve(false))).rejects.toBeInstanceOf(
      NoDefaultCaseError,
    );
  });

  it("matches numbers", async () => {
    const matcher = match(
      when(3, (val) => val + 1),
      when(predicate<number>((val) => val % 5 === 0), (val) => val + 1),
      when(1, (val) => val + 1),
      otherwise(() => -1),
    );
    await expectMatch(matcher, 1, 2);
    await expectMatch(matcher, 2, -1);
    await expectMatch(matcher, 3, 4);
    await expectMatch(matcher, 10, 11);
  });

  it("matches strings", async () => {
    const matcher = match(
      when("hello", (val) => val + "2"),
      when(predicate((val) => val.charAt(2) === "c"), (val) => val + "11"),
      when("bye", (val) => val + "4"),
      otherwise(() => "-1"),
    );
    await expectMatch(matcher, "hello", "hello2");
    await expectMatch(matcher, "something else", "-1");
    await expectMatch(matcher, "bye", "bye4");
    await expectMatch(matcher, "abc", "abc11");
  });

  it("matches types", async () => {
    const matcher = match(
      whenBoolean((val) => (val ? 1 : -1)),
      whenNumber((val) => val * 3),
      whenString(() => 123),
      when(C3, (val) => val.message.length),
      // careful a C2 is always instanceof a C1, making C1 the more general case!
      when(C2, (val) => val.num * 2),
      when(C1, (val) => val.num),
      whenPresent(() => 11),
      otherwise(() => -1),
    );
    await expectMatch(matcher, 3, 9);
    await expectMatch(matcher, false, -1);
    await expectMatch(matcher, true, 1);
    await expectMatch(matcher, new C2(), 6);
    await expectMatch(matcher, new C1(), 3);
    await expectMatch(matcher, new C3(), 5);
    await expectMatch(matcher, new Date(), 11);
    await expectMatch(matcher, null, -1);
  });
});
