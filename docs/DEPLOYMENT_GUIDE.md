# 🚀 INDUSENSE AI — Firebase Deployment Guide

INDUSENSE AI is deployed directly on **Firebase Hosting** and backed by **Google Cloud Firestore** and **Firebase Authentication**.

---

## 🌟 1-Click Deployment to Firebase Hosting

### Prerequisites
- Node.js 18+ & npm
- Firebase CLI (`firebase-tools` via `npx`)

### Deploy Commands

From the project root:
```bash
# Build frontend and deploy directly to Firebase Hosting
npm run deploy:firebase
```

Or step-by-step:
```bash
cd frontend
npm install
npm run build
cd ..
npx firebase-tools deploy --only hosting
```

Your live web application will be immediately available globally at:
👉 [**https://ai-predictive-maintenanc-ad8eb.web.app**](https://ai-predictive-maintenanc-ad8eb.web.app)

---

## 🔑 Firebase Configuration

The project is pre-configured with project ID: `ai-predictive-maintenanc-ad8eb`

- **Firebase Hosting**: `firebase.json`
- **Firestore Rules**: `firestore.rules`
- **Firestore Indexes**: `firestore.indexes.json`
- **Project Configuration**: `.firebaserc` & `frontend/src/firebase/config.js`
