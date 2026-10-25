interface GlobalPolyfill {
  document?: {
    body?: { appendChild: () => void };
    createElement: () => {
      onload?: () => void;
      pathname: string;
      setAttribute: () => void;
      sheet?: {
        cssRules: unknown[];
        deleteRule: () => void;
        insertRule: () => number;
      };
      style: Record<string, unknown>;
    };
    getElementById: () => null;
    head?: { append: () => void; appendChild: () => void };
  };
  window?: {
    matchMedia?: (query: string) => {
      addEventListener: () => void;
      addListener: () => void;
      dispatchEvent: () => boolean;
      matches: boolean;
      media: string;
      onchange: null;
      removeEventListener: () => void;
      removeListener: () => void;
    };
  };
}

const g = globalThis as unknown as GlobalPolyfill;

if (g.window && !g.window.matchMedia) {
  g.window.matchMedia = (query: string) => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  });
}

if (typeof g.document === "undefined") {
  g.document = {
    body: {
      appendChild: () => undefined,
    },
    createElement: () => ({
      onload: () => undefined,
      pathname: "",
      setAttribute: () => undefined,
      sheet: {
        cssRules: [],
        deleteRule: () => undefined,
        insertRule: () => 0,
      },
      style: {},
    }),
    getElementById: () => null,
    head: {
      append: () => undefined,
      appendChild: () => undefined,
    },
  };
}
