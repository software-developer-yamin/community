import { mock } from "bun:test";
import { join } from "node:path";

const rnShim = join(import.meta.dirname, "react-native-shim.js");

mock.module("react-native", () => {
  const Shim = require(rnShim);
  return { ...Shim };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
// biome-ignore lint/style/useNodejsImportProtocol: bun require() does not support node: protocol
const Module = require("module");
const origResolveFilename: (
  request: string,
  parent: unknown,
  ...rest: unknown[]
) => unknown = Module._resolveFilename;

Module._resolveFilename = function (
  request: string,
  parent: unknown,
  ...rest: unknown[]
) {
  if (request === "react-native") {
    return origResolveFilename.call(this, rnShim, parent, ...rest);
  }
  return origResolveFilename.call(this, request, parent, ...rest);
};
