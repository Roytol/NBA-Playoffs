import React from "react";
import { STORAGE_KEYS } from "@/constants/app";

const ThemeContext = React.createContext(null);

const THEME_META_COLOR = {
  light: "#0a1628",
  dark: "#020817",
};

function getPreferredTheme() {
  if (typeof window === "undefined") return "light";

  const savedTheme = window.localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", THEME_META_COLOR[theme]);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(getPreferredTheme);

  React.useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
  }, [theme]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const savedTheme = window.localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);

    if (savedTheme === "light" || savedTheme === "dark") {
      return undefined;
    }

    const handleChange = (event) => {
      setTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      isDarkMode: theme === "dark",
      setTheme,
      toggleTheme: () =>
        setTheme((currentTheme) =>
          currentTheme === "dark" ? "light" : "dark",
        ),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
