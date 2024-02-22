import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
  {
    external: [],
    input: "src/command/index.ts",
    output: [
      // {
      //   file: "bin/command.js",
      //   format: "es",
      //   exports: "named",
      // },
      {
        file: "bin/command.cjs",
        format: "cjs",
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
