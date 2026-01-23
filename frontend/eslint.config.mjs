import eslintJs from "@eslint/js";
import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  eslintJs.configs.recommended,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
