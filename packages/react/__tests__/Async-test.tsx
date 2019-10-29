/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import Enzyme, { mount } from "enzyme";
import { Async } from "../src/Async";
import Adapter from "enzyme-adapter-react-16";
import { act } from "react-dom/test-utils";

Enzyme.configure({ adapter: new Adapter() });

it("renders a resolved promise", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Async
        promise={Promise.resolve("hello")}
        then={(value) => value}
        catch={() => "caught"}
      >
        loading
      </Async>,
    );
  });
  expect(component.text()).toBe("loading");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("hello");
});

it("renders a resolved promise without then", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Async promise={Promise.resolve("hello")} catch={() => "caught"}>
        nil
      </Async>,
    );
  });
  expect(component.text()).toBe("nil");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders a resolved promise without body", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Async promise={Promise.resolve("hello")} then={(value) => value} />,
    );
  });
  expect(component.text()).toBe("");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("hello");
});

it("renders a rejected promise", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Async
        promise={Promise.reject("err")}
        then={(value) => value}
        catch={(err) => err as string}
      >
        loading
      </Async>,
    );
  });
  expect(component.text()).toBe("loading");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("err");
});

it("renders a rejected promise without catch", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Async promise={Promise.reject("err")} then={(value) => value}>
        nil
      </Async>,
    );
  });
  expect(component.text()).toBe("nil");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders a rejected promise without body", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Async promise={Promise.reject("err")} catch={(err) => err as string} />,
    );
  });
  expect(component.text()).toBe("");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("err");
});
