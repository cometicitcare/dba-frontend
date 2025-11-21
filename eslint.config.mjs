import path from "node:path";
import { FlatCompat } from "@eslint/eslintrc";

// Use FlatCompat to consume the existing eslint-config-next presets with the flat config file.
const compat = new FlatCompat({
  baseDirectory: path.resolve(),
});

const config = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default config;
