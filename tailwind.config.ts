import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "petal-open": {
          from: { opacity: "0", transform: "scale(0) translate(0,0)" },
          to: { opacity: "1", transform: "scale(1) translate(var(--tx), var(--ty))" }
        }
      },
      animation: { "petal-open": "petal-open 0.3s ease-out forwards" }
    }
  },
  plugins: []
};
export default config;