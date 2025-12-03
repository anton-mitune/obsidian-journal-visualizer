// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    ignores: ["**/*.js", "**/*.jsx", "**/*.tsx", "**/*.mjs", "**/*.cjs", "**/joviz-demo-vault/**"],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/utils/logger.ts"],
    rules: {
      "no-console": "off"
    }
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        console: "readonly",
        window: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        NodeJS: "readonly",
      },
    },
    rules: {
	  "@typescript-eslint/no-unsafe-member-access":"off",
	  "@typescript-eslint/no-unsafe-call":"off",
	  "@typescript-eslint/no-unsafe-argument":"off",
	  "@typescript-eslint/no-unsafe-assignment":"off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    }
  },
]);
