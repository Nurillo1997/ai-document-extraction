import { createContext, useContext, useState } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

/**
 * Tracks whether the user is currently logged in, and exposes login/logout
 * actions. Components that need to know "is someone logged in right now"
 * (e.g. ProtectedRoute) read this instead of checking localStorage
 * directly everywhere, which would scatter that logic across the app.
 */
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    authApi.isAuthenticated()
  );

  async function login(email, password) {
    await authApi.login(email, password);
    setIsAuthenticated(true);
  }

  function logout() {
    authApi.logout();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}