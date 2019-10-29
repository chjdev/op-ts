import React from "react";
import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { act } from "react-dom/test-utils";
import { Unwrap, withOptional } from "../src/Unwrap";
import { empty, optional } from "@opresults/optional";

Enzyme.configure({ adapter: new Adapter() });

const opt = optional("hello");
const empt = empty<string>();

it("renders a filled optional", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Unwrap optional={opt} present={(value) => value} otherwise={() => "nil"}>
        loading
      </Unwrap>,
    );
  });
  expect(component.text()).toBe("loading");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("hello");
});

it("renders a filled optional without present", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Unwrap optional={opt} otherwise={() => "nil"}>
        nil
      </Unwrap>,
    );
  });
  expect(component.text()).toBe("nil");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders a filled optional without body", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Unwrap
        optional={opt}
        present={(value) => value}
        otherwise={() => "nil"}
      />,
    );
  });
  expect(component.text()).toBe("");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("hello");
});

it("renders an unfilled optional", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Unwrap
        optional={empt}
        present={(value) => value}
        otherwise={() => "nil"}
      >
        loading
      </Unwrap>,
    );
  });
  expect(component.text()).toBe("loading");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders an unfilled optional without otherwise", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Unwrap optional={empt} present={(value) => value}>
        nil
      </Unwrap>,
    );
  });
  expect(component.text()).toBe("nil");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders an unfilled optional without body", async () => {
  let component: any;
  await act(async () => {
    component = mount(
      <Unwrap
        optional={empt}
        present={(value) => value}
        otherwise={() => "nil"}
      />,
    );
  });
  expect(component.text()).toBe("");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders the HOC for filled Optional", async () => {
  const HOC = withOptional(
    "value",
    ({ value }: { value: string }) => <>{value}</>,
    { loading: "loading" },
  );
  let component: any;
  await act(async () => {
    component = mount(<HOC value={opt} />);
  });
  expect(component.text()).toBe("loading");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("hello");
});

it("renders the HOC for unfilled Optional", async () => {
  const HOC = withOptional(
    "value",
    ({ value }: { value: string }) => <>{value}</>,
    { loading: "loading", Otherwise: () => <>nil</> },
  );
  let component: any;
  await act(async () => {
    component = mount(<HOC value={empt} />);
  });
  expect(component.text()).toBe("loading");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders the HOC for unfilled Optional without Otherwise", async () => {
  const HOC = withOptional(
    "value",
    ({ value }: { value: string }) => <>{value}</>,
    { loading: "nil" },
  );
  let component: any;
  await act(async () => {
    component = mount(<HOC value={empt} />);
  });
  expect(component.text()).toBe("nil");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("nil");
});

it("renders the HOC for unfilled Optional with default", async () => {
  const HOC = withOptional(
    "value",
    ({ value }: { value: string }) => <>{value}</>,
    { loading: "nil", def: "def" },
  );
  let component: any;
  await act(async () => {
    component = mount(<HOC value={empt} />);
  });
  expect(component.text()).toBe("nil");
  act(() => {
    component.update();
  });
  expect(component.text()).toBe("def");
});
