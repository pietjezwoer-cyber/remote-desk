// Proxies /api/* to the Python backend so the browser never hits CORS.
const BACKEND = process.env.BACKEND_URL || "https://python-backend-y3ul.onrender.com";
module.exports = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
};
