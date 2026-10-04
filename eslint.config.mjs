import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      // Not linted until it has been split into typed components.
      "src/PadelLeagueApp.jsx",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      // Photos are arbitrary external or data: URLs, so the app uses plain
      // <img> rather than next/image, which needs known remote hosts.
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
