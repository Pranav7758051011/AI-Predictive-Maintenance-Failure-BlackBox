# 🚀 INDUSENSE AI — Production Deployment Guide

This guide covers 3 standard production deployment pathways:
1. **Option 1 (Recommended & 100% Free)**: [Render.com](https://render.com) + [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Option 2 (Fastest UI Deployment)**: [Vercel](https://vercel.com) (Frontend) + [Render](https://render.com) (Backend)
3. **Option 3 (Dockerized Container Stack)**: Docker Compose on AWS EC2, DigitalOcean, or Azure

---

## 🌟 Option 1: Deploy on Render + MongoDB Atlas (Recommended Free Cloud)

### Step 1: Create a Free MongoDB Atlas Database
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a user (e.g. `admin` and a secure password).
4. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere).
5. Click **Connect** $\rightarrow$ **Drivers (Python)** $\rightarrow$ Copy your connection string:
   ```
   mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/ai_predictive_maintenance_db?retryWrites=true&w=majority
   ```

### Step 2: Deploy Backend on Render
1. Go to [render.com](https://render.com) and log in with GitHub.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select your repository: `AI-Predictive-Maintenance-Failure-BlackBox`.
4. Configure:
   - **Name**: `indusense-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 backend.run:app`
5. Under **Environment Variables**, add:
   - `FLASK_ENV`: `production`
   - `MONGO_URI`: *(Your MongoDB Atlas connection string from Step 1)*
   - `MONGO_DB_NAME`: `ai_predictive_maintenance_db`
   - `JWT_SECRET_KEY`: `your-secure-jwt-secret-key-2026`
   - `CORS_ORIGINS`: `*`
6. Click **Create Web Service**. Your backend will deploy at `https://indusense-backend.onrender.com`.

### Step 3: Deploy Frontend on Render
1. Click **New +** $\rightarrow$ **Static Site**.
2. Select your repository.
3. Configure:
   - **Name**: `indusense-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://indusense-backend.onrender.com`
5. Click **Create Static Site**.

---

## ⚡ Option 2: Deploy Frontend on Vercel & Backend on Render

1. Go to [vercel.com](https://vercel.com) and connect your GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Environment Variables:
   - `VITE_API_URL`: *(Your deployed Render backend URL)*
5. Click **Deploy**. Vercel will build and assign you a fast global CDN domain (e.g. `https://indusense-ai.vercel.app`).

---

## 🐳 Option 3: Deploy Using Docker Compose (Single Server / VM)

Run the full 3-tier container stack (MongoDB 7.0 + Flask Gunicorn + Nginx React Frontend):

```bash
# Clone the repository
git clone https://github.com/Pranav7758051011/AI-Predictive-Maintenance-Failure-BlackBox.git
cd AI-Predictive-Maintenance-Failure-BlackBox

# Start the full production stack in detached mode
docker-compose up -d --build
```

- **Frontend Application**: `http://your-server-ip:80` (or `http://localhost:80`)
- **Backend REST API**: `http://your-server-ip:5000`
- **Swagger Documentation**: `http://your-server-ip:5000/api/docs/`
- **MongoDB**: `localhost:27017`
