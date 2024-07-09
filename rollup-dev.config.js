import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
  {
    external: ["axios"],
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.mjs",
        format: "es",
        exports: "named",
      },
    ],
    plugins: [
      typescript(),
      nodeResolve({ browser: false }),
      commonjs(),
      json(),
    ],
  },
  {
    external: ["axios"],
    input: "src/command/index.ts",
    output: [
      {
        file: "dist/command.mjs",
        format: "es",
        exports: "named",
      },
    ],
    plugins: [
      typescript(),
      nodeResolve({ browser: false }),
      commonjs(),
      json(),
    ],
  },
];
