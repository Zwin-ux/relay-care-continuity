import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A1B3D",
        canvas: "#F4F7FB",
        surface: "#FFFFFF",
        rail: "#F8FAFD",
        line: "#D7DEE9",
        heavy: "#A7B0C0",
        text: "#0A1B3D",
        muted: "#64748B",
        blue: "#578BFA",
        blueDark: "#3867D6",
        blueWash: "#EAF1FF",
        amber: "#A96200",
        amberWash: "#FFF4D8",
        danger: "#C0352B",
        dangerWash: "#FFF0ED",
        positive: "#247A4D",
        positiveWash: "#EAF7EF"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      }
      ,
      boxShadow: {
        premium: "0 24px 80px rgba(10, 27, 61, 0.12)",
        soft: "0 12px 32px rgba(10, 27, 61, 0.10)",
        card: "0 8px 24px rgba(10, 27, 61, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
