import { createContext, useContext, useInsertionEffect, useState } from "react";
import { IdSet } from "./idset";

// A simple css-in-js module
// See example() on how to use this API

export type FunctionWithCSS = Function & { css: string };

export function css(strings: TemplateStringsArray, ...args: string[]) {
  const values: string[] = [];
  for (let i = 0; i < strings.raw.length; i++) {
    values.push(strings.raw[i]);
    if (args[i]) values.push(args[i].toString());
  }
  return values.join("").trim();
}

export const CssContext = createContext(new IdSet());

export function useCSS(
  component: Function | FunctionWithCSS,
  opts: { scope?: string } = {}
) {
  const styleSet = useContext(CssContext);
  const [css, setCss] = useState<string | undefined>(undefined);
  const [called, setCalled] = useState(false);

  useInsertionEffect(() => {
    if (!styleSet.get(component)) {
      const id = styleSet.add(component);
      const style = document.createElement("style");
      style.textContent = css ?? ("css" in component ? component.css : "");
      style.id = component.name + "-" + id;

      if (opts.scope) {
        style.textContent = opts.scope + " { " + style.textContent + "\n}";
      }

      document.head.appendChild(style);
    }
  }, [css, styleSet, called]);

  if (called) return (_: unknown) => {};

  return (strings: TemplateStringsArray, ...args: string[]) => {
    const values: string[] = [];
    for (let i = 0; i < strings.raw.length; i++) {
      values.push(strings.raw[i]);
      if (args[i]) values.push(args[i].toString());
    }
    const css = values.join("").trim();

    setCalled(true);
    setCss(css);
  };
}

function example() {
  function App() {
    // When App is rendered
    //   #foo { background: blue; }
    //   #bar { background: red; }
    // will added to <head> only once.

    return (
      <div>
        <Foo />
        <Foo />
        <Bar />
        <Bar />
        <Bar />
      </div>
    );
  }

  function Foo() {
    useCSS(Foo, { scope: "#foo" });
    return <div id="foo"></div>;
  }
  Foo.css = css`
    background: blue;
  `;

  function Bar() {
    const css = useCSS(Bar);
    css`
      #bar {
        background: red;
      }
    `;
    return <div id="bar"></div>;
  }
}
