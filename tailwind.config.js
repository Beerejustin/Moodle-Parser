module.exports = {
    darkMode: ["class"],
    content: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "./**/*.{html,js}", "*.{js,ts,jsx,tsx,mdx}"],
    theme: {
      extend: {
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
            light: "#818cf8",
            dark: "#3730a3",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          surface: {
            DEFAULT: "#f9fafb",
            hover: "#f3f4f6",
          },
        },
        boxShadow: {
          "elevation-1": "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
          "elevation-2": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
        animation: {
          float: "float 3s ease-in-out infinite",
          pulse: "pulse 2s infinite",
        },
        keyframes: {
          float: {
            "0%, 100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-10px)" },
          },
          pulse: {
            "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(79, 70, 229, 0.7)" },
            "70%": { transform: "scale(1)", boxShadow: "0 0 0 6px rgba(79, 70, 229, 0)" },
            "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(79, 70, 229, 0)" },
          },
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
      },
    },
    plugins: [require("tailwindcss-animate")],
  }
  
  