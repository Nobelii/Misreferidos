import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Regla nueva de eslint-plugin-react-hooks 7. Marca patrones que hoy
    // funcionan (detectar el montaje, resetear un modal al abrirse). Queda en
    // warn hasta migrarlos a useSyncExternalStore / estado derivado.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
