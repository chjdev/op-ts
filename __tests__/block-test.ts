import { block } from "../src/block";
import { empty, NullError, optional, Optional } from "../src/optional";

const valA = optional(5);
const valB = optional("hello");
const valC = optional(2);
const valD: number | null = 4;
const emptyE = empty<string>();

describe("optional block test cases", () => {
  it("run simple blocks", async () => {
    const opt: Optional<string> = await block(async (just) => {
      const a: number = await just(valA);
      const b: string = await just(valB);
      const c: number = await just(valD);
      return c === 4 ? `${a}${b}` : "";
    });
    await expect(opt.get()).resolves.toBe("5hello");
  });

  it("run nested blocks", async () => {
    const opt: Optional<string> = await block(async (just) => {
      const mapped = valA.map(async (val) => (await just(valC)) * val);
      const a: number = await just(mapped);
      const b: string = await just(valB);

      return `${a}${b}`;
    });
    await expect(opt.get()).resolves.toBe("10hello");
  });

  it("exits on empty", async () => {
    const opt: Optional<string> = await block(async (just) => {
      const a: number = await just(valA);
      const b: string = await just(emptyE);
      return `${a}${b}`;
    });
    try {
      await opt.get();
    } catch (err) {
      expect(err).toBeInstanceOf(NullError);
    }
  });
});
