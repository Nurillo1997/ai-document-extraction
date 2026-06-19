import apiClient from "./client";

/**
 * Calls POST /auth/signup. Returns the created user's public data
 * (id, email, created_at) -- never a password or token, matching the
 * backend's UserResponse schema.
 */
export async function signup(email, password) {
  const response = await apiClient.post("/auth/signup", { email, password });
  return response.data;
}

/**
 * Calls POST /auth/login. On success, stores the JWT in localStorage
 * so apiClient's interceptor can attach it to future requests.
 */
export async function login(email, password) {
  const response = await apiClient.post("/auth/login", { email, password });
  const { access_token } = response.data;
  localStorage.setItem("access_token", access_token);
  return response.data;
}

export function logout() {
  localStorage.removeItem("access_token");
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("access_token"));
}