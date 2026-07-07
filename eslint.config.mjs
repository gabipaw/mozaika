// ESLint (flat config) dla monorepo Mozaika.
// Linter = wykrywa błędy i antywzorce (inaczej niż Prettier, który tylko formatuje).
// eslint-config-prettier na końcu wyłącza reguły kolidujące z Prettierem.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Nieużywane zmienne to błąd, ale świadome pominięcie z prefiksem _ jest OK.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "always"], // zawsze === zamiast ==
      "no-var": "error", // tylko const/let
      "prefer-const": "error",
    },
  },
  prettier,
);
