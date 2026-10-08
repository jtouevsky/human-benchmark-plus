import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "next-env.d.ts",
      "node_modules/**",
      ".next*/**",
      "out/**",
      "artifacts/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "off",
      "no-empty": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
