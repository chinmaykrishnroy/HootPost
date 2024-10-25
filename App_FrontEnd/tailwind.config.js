/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // primary: { DEFAULT: "#f22fb1", 100: "#f00ea5", 200: "#d80c94", 300: "#252525" },
        // secondary: { DEFAULT: "#eab7d9", 100: "#e6a7d1", 200: "#e29bcb" },
        // black: { DEFAULT: "#1c161a", 100: "#0e0b0d", 200: "#050405" },
        primary: {'DEFAULT': '#d80c94', '100': '#f00ea5', '200': '#f33eb7', '300': '#ff3fc6'},
        secondary: {'DEFAULT': '#eab7d9', '100': '#e49fcd', '200': '#dd87c0', '300': '#f8e6f2'},
        black: {'DEFAULT': '#1c161a', '100': '#0e0b0d', '200': '#050405'},
        primary2: {'DEFAULT': '#0bc029', '100': '#0ef033', '200': '#3ef35c', '300': '4eff5f'},
        secondary2: {'DEFAULT': '#b7eabf', '100': '#9fe4aa', '200': '#87dd95', '300': '#77cd85'},
        black2: {'DEFAULT': '#161c17', '100': '#0b0e0b', '200': '#040504'},
        background: {'DEFAULT': "#000000", '100': "#050505", '200': "#101010", '300':'151515' },
      },
      fontFamily: {
        opensans: ["Open Sans", "sans-serif"],
        Poppins: ["Poppins", "sans-serif"],
        spotifymixblack: ["Spotify Mix Black", "sans-serif"],
        spotifymixui: ["Spotify Mix UI", "sans-serif"],
        spotifymixuititle: ["Spotify Mix UI Title", "sans-serif"],
        spotifymixuititleextrabold: [
          "Spotify Mix UI Title Extrabold",
          "sans-serif",
        ],
        spotifymixuititlevar: ["Spotify Mix UI Title Var", "sans-serif"],
      },
    },
  },
  plugins: [
    function ({ addBase, theme }) {
      addBase({
        ":root": {
          "--hue-color": "20", // Define your hue color here
        },
      });
    },
  ],
};
