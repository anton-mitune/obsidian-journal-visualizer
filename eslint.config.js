import js from "@eslint/js";
import ts from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    ignores: ["joviz-demo-vault/**", "main.js", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: {
      obsidianmd: obsidianmd,
    },
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      ...obsidianmd.configs.recommendedWithLocalesEn.rules,
    },
  },
];
