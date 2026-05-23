import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("fin_token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("fin_token");
  }
}

export function loadStoredToken() {
  const t = localStorage.getItem("fin_token");
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
  return t;
}
