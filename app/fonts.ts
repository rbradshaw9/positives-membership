import localFont from "next/font/local";

export const montserrat = localFont({
  src: [
    { path: "./fonts/Montserrat-100.ttf", weight: "100", style: "normal" },
    { path: "./fonts/Montserrat-200.ttf", weight: "200", style: "normal" },
    { path: "./fonts/Montserrat-300.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Montserrat-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Montserrat-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Montserrat-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Montserrat-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Montserrat-800.ttf", weight: "800", style: "normal" },
    { path: "./fonts/Montserrat-900.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Poppins-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Poppins-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Poppins-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});
