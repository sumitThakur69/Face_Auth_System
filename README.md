# 🛡️ Face Recognition Authentication API

A backend-only **REST API** for user authentication using **face recognition**.  
Built with **Node.js, Express.js, and MongoDB**, this project allows secure user registration and login through facial biometric data.

---

## 🚀 Features
- 📸 **Face Enrollment** – Register new users by capturing and storing their face embeddings.
- 🧠 **Facial Recognition** – Authenticate users by matching live input with stored embeddings.
- 🔐 **Secure Storage** – Face embeddings stored securely in MongoDB.
- ⚡ **REST API Endpoints** – Ready to integrate with any frontend or mobile app.
- 📊 **High Accuracy** – Tuned similarity threshold to reduce false positives/negatives.
- 🛡️ **Spoofing Protection** – Supports optional liveness checks.

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Face Recognition:** `face-api.js` / `opencv4nodejs` / Python bridge (if using `face_recognition`)
- **Database:** MongoDB (Mongoose ODM)
- **Security:** JWT Authentication, bcrypt (for password fallback)
- **Storage:** GridFS / Base64 / Binary embedding storage in Mongo

---

## 📂 Project Structure
FACE_AUTH_SYSTEM/
│
├── Backend/
│ ├── config/ # Database and app configurations
│ ├── controllers/ # API business logic
│ ├── middleware/ # Middleware (auth, error handling, etc.)
│ ├── models/ # Mongoose schemas
│ ├── node_modules/ # Node.js dependencies
│ ├── routes/ # API endpoint routes
│ ├── .env # Environment variables (local)
│ ├── .env.example # Sample environment variables
│ ├── .gitignore # Ignored files for git
│ ├── package.json # Node project configuration
│ ├── package-lock.json # Dependency lock file
│ └── server.js # Main Express server entry point
│
├── Docs/ # Project documentation
│
├── python-services/
│ ├── face_recognition_env/ # Python virtual environment
│ ├── face_reco_service.py # Facial recognition service logic
│ ├── requirements.txt # Python dependencies
│ └── .gitignore # Ignored Python files
│
└── README.md # Project documentation file

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/YourUsername/Face-Auth-System.git
cd Face-Auth-System
cd Backend
npm install
cd python-services
pip install -r requirements.txt
PORT=3000
MONGO_URI=mongodb://localhost:3000/faceAuth
JWT_SECRET=your_secret_key
PYTHON_SERVICE_URL=http://localhost:3000
cd Backend
npm start
📡 API Endpoints
POST /api/register
Registers a new user by capturing face embeddings.

Body: { name, email, faceImage }

POST /api/login
Authenticates a user by matching live face input.

Body: { faceImage }

📏 Accuracy Measurement
Accuracy is calculated as:

ini
Copy
Edit
Accuracy = (TP + TN) / (TP + TN + FP + FN) × 100
Where:

TP: Correctly recognized known faces

TN: Correctly rejected unknown faces

FP: Wrongly accepted an unknown face

FN: Failed to recognize a known face


📜 License
Licensed under the MIT License – you can use and modify freely.
