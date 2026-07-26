import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  { rules: { "react-hooks/set-state-in-effect": "off", "react-hooks/refs": "off" } },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "node_modules/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);
