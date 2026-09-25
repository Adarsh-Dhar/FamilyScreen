// Point this at your deployed API server (the same one the web app uses).
// Set EXPO_PUBLIC_API_BASE_URL in a .env file, or hardcode the fallback below.
export const API_BASE_URL = "http://10.0.2.2:8080";

export const WS_URL = API_BASE_URL.replace(/^http/, "ws") + "/ws";

console.log("API_BASE_URL:", API_BASE_URL);
console.log("WS_URL:", WS_URL);
