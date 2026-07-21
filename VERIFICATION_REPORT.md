# Verification & Resolution Report: dev.ssjewellry.com Connection Error

This report outlines the root cause, applied fixes, and instructions for zero-code URL modifications in the future.

---

## 1. Root Cause Analysis

We performed deep inspection of the live application bundle and backend server endpoints and identified two critical issues:

1. **Incorrect Default Backend URL**:
   * In `frontend/src/context/AuthContext.jsx`, the default fallback backend URL was configured to point to `https://ssjewellery-main.onrender.com/api`.
   * This backend URL is inactive/deleted on Render (returning `404 Not Found` with Render's `no-server` headers).
   * The actual, running backend server is hosted at `https://live-hosting-dev.onrender.com/api` (which correctly responds with product data).

2. **CORS Restrictions on Flask Backend**:
   * The backend's CORS policy in `backend/app.py` was hardcoded to only allow requests from `http://localhost:5173`.
   * Consequently, when the live frontend (`https://dev.ssjewellry.com/`) sent API requests to the active backend (`https://live-hosting-dev.onrender.com/api`), the web browser blocked all requests due to CORS violations.

---

## 2. Actions Implemented

We applied the following fixes to resolve both issues:

### A. Frontend: Correct Default API Endpoint
* **File modified**: `frontend/src/context/AuthContext.jsx`
* **Changes**: Updated the production fallback URL to the active backend server:
  ```diff
  -  return 'https://ssjewellery-main.onrender.com/api';
  +  return 'https://live-hosting-dev.onrender.com/api';
  ```

### B. Backend: Enabled Staging/Production CORS Access
* **File modified**: `backend/app.py`
* **Changes**: Configured CORS to dynamically resolve origins, adding regex support for localhost, the staging domain `dev.ssjewellry.com`, any subdomains of `ssjewellry.com` and `onrender.com`, and enabling wildcard/comma-separated custom origins via environment variables:
  ```python
  allowed_origins = [
      r"https?://localhost:\d+",
      r"https?://127\.0\.0\.1:\d+",
      r"https?://.*\.ssjewellry\.com",
      r"https?://ssjewellry\.com",
      r"https?://.*\.onrender\.com"
  ]
  env_origins = os.getenv("ALLOWED_ORIGINS")
  if env_origins:
      if env_origins.strip() == "*":
          allowed_origins = [r".*"]
      else:
          allowed_origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])
  ```

---

## 3. How to Change URLs in the Future Without Modifying Code

To change your domain names or deploy to new endpoints without editing files, configure environment variables:

1. **If you change the Frontend website URL**:
   * Go to your **Vercel** dashboard.
   * Add or edit the Environment Variable `VITE_API_BASE_URL` or `VITE_API_URL` to point to your new backend URL (e.g. `VITE_API_BASE_URL=https://live-hosting-dev.onrender.com/api`).
   * Trigger a rebuild on Vercel.

2. **If you change the Backend URL or use a completely new Frontend Domain**:
   * Go to your **Render** dashboard for the backend service (`live-hosting-dev`).
   * Add the Environment Variable `ALLOWED_ORIGINS` and set its value to your new domains (comma-separated, e.g. `https://my-new-domain.com,https://www.my-new-domain.com`) or set it to `*` to dynamically allow any domain.
   * Redeploy the service on Render.
