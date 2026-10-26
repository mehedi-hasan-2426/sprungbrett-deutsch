import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: [".next/**", "out/**", "node_modules/**", "content/generated/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Never inject HTML. Render structured data as React elements." },
        { selector: "JSXAttribute[name.name='style']", message: "Inline styles break the strict CSP; use a CSS class." },
        { selector: "CallExpression[callee.name='eval']", message: "eval is forbidden." },
        { selector: "NewExpression[callee.name='Function']", message: "Function constructor is forbidden." },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", URL: "readonly" } },
  },
);
