import { ExtendRuntimeError } from "../src/error";

class TestAPIError extends ExtendRuntimeError("TestAPIError", "api error") {
  constructor(public readonly value: number = -1) {
    super();
  }
}

class TestStateError extends ExtendRuntimeError(
  "TestStateError",
  "state error",
) {}

describe("test error base class", () => {
  it("enforces unique names", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class TestFail extends ExtendRuntimeError("TestAPIError") {}
    }).toThrow("RuntimeError extensions require unique names!");
  });

  it("sets correct values", () => {
    const api = new TestAPIError();
    expect(api).toBeInstanceOf(TestAPIError);
    expect(api).not.toBeInstanceOf(TestStateError);
    expect(api.name).toBe("TestAPIError");
    expect(api.message).toBe("api error");

    const state = new TestStateError();
    expect(state).toBeInstanceOf(TestStateError);
    expect(state).not.toBeInstanceOf(TestAPIError);
    expect(state.name).toBe("TestStateError");
    expect(state.message).toBe("state error");
  });
});
