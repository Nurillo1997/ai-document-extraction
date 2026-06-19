import axios from "axios";

// Centralizing the API base URL here means every other file imports
// this client instead of calling axios.get/post directly -- if the
// backend URL ever changes (e.g. moving from localhost to Render),
// only this one line needs to change.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// An axios "interceptor" runs before every outgoing request. Here we
// read the JWT from localStorage and attach it as a Bearer token, so
// every protected endpoint call (upload, history, stats, document
// detail) automatically includes it -- individual page components
// never need to remember to add the header themselves.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever responds 401 (token expired or invalid), we clear
// the stored token and redirect to login. Without this, the app would
// be stuck showing confusing errors on every subsequent request instead
// of prompting the user to log in again.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;