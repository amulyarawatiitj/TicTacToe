// Nakama connection config
// Override with environment variables (set in Netlify dashboard for prod)
const config = {
  host:       import.meta.env.VITE_NAKAMA_HOST    || "127.0.0.1",
  port:       import.meta.env.VITE_NAKAMA_PORT    || "7350",
  serverKey:  import.meta.env.VITE_NAKAMA_KEY     || "defaultkey",
  useSSL:     import.meta.env.VITE_NAKAMA_SSL === "true",
};

export default config;
