import { createContext, useContext, useInsertionEffect, useState } from "react";
import { IdSet } from "./idset";

// A simple css-in-js module
// See example() on how to use this API

export type FunctionWithCSS = Function & { css: string };

export function css(styleStr: TemplateStringsArray, ...args: unknown[]) {
  if (args.length > 0 || styleStr.length > 1) {
    throw "css does not support interpolation (yet), please use a static string";
  }

  return styleStr[0];
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

  return (css: TemplateStringsArray) => {
    setCalled(true);
    setCss(css[0]);
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
