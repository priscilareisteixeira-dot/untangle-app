import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: {
          50: "#F6F2FD",
          100: "#EDE6FB",
          200: "#D9CDF5",
          400: "#977FE0",
          500: "#7B5FD1",
          600: "#6247B8",
          700: "#4A3690",
          800: "#332762",
          900: "#241D3E",
        },
        pink: { 100: "#FCE3E9", 600: "#E85E7A" },
        orange: { 100: "#FCEFD8", 600: "#E8940E" },
        green: { 100: "#E1F5EA", 600: "#2F9E6E" },
        ink: {
          DEFAULT: "#2B2545",
          soft: "#726B92",
          faint: "#A29CBE",
        },
        paper: "#FBF9FE",
        line: "#EAE4F7",
      },
      fontFamily: {
        display: ["var(--font-baloo)", "sans-serif"],
        body: ["var(--font-nunito)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 14px rgba(74,54,144,0.10)",
        card: "0 12px 28px rgba(74,54,144,0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
