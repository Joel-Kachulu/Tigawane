declare module 'react' {
  export = React;
  export as namespace React;
}

declare namespace React {
  interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }

  type JSXElementConstructor<P> = ((props: P) => ReactElement | null) | (new (props: P) => Component<P, any>);

  interface Component<P = {}, S = {}, SS = any> extends ComponentLifecycle<P, S, SS> {}

  interface ComponentLifecycle<P, S, SS = any> {}

  type Key = string | number;

  interface ReactNode {
    [key: string]: any;
  }

  interface ReactPortal extends ReactElement {
    key: null | string;
    children: ReactNode;
  }

  type ReactText = string | number;
  type ReactChild = ReactElement | ReactText;

  type ReactFragment = {} | Iterable<ReactNode>;

  type ReactNode = ReactChild | ReactFragment | ReactPortal | boolean | null | undefined;
}

declare module 'react-dom' {
  export = ReactDOM;
  export as namespace ReactDOM;
}

declare namespace ReactDOM {
  function render(element: React.ReactElement, container: Element | null): void;
  function createPortal(children: React.ReactNode, container: Element): React.ReactPortal;
}
