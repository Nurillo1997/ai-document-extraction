import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

/**
 * Provides the current theme ("light" | "dark") and a toggle function to
 * the whole app. The actual color swap happens in CSS (see index.css's
 * [data-theme="..."] selectors) -- this context's only job is to decide
 * which value that data-theme attribute should have, and to persist the
 * user's choice across page reloads.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Restore the user's last choice on page load, defaulting to "light"
    // for a first-time visitor with nothing saved yet.
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook for any component to read the current theme or toggle it,
 * e.g. const { theme, toggleTheme } = useTheme();
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}