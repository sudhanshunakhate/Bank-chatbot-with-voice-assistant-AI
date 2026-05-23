# Apex Horizon Bank - Setup & Dependencies Guide

This document lists all system prerequisites, Node.js frontend dependencies, Python backend dependencies, and provides instructions to set up and run the project on any other system.

---

## 🖥️ System Prerequisites
Make sure the host machine has the following runtimes installed:
1. **Python 3.10 or newer** (with `pip` and `venv` modules)
2. **Node.js 18.x or newer** (which includes `npm`)
3. **SQLite** (built-in with Python standard library, used for the database `/backend/finadvisor.db`)

---

## 🐍 Backend Dependencies (Python)
These packages are listed in [backend/requirements.txt](file:///c:/Users/snakhate/Downloads/chatbot/backend/requirements.txt):

| Package | Version | Purpose |
| :--- | :--- | :--- |
| **fastapi** | `0.115.6` | Modern, high-performance web framework for the API server |
| **uvicorn[standard]** | `0.32.1` | ASGI server implementation to run and reload the FastAPI application |
| **sqlalchemy** | `2.0.36` | Database ORM mapping used to interact with SQLite databases |
| **python-jose[cryptography]** | `3.3.0` | JSON Web Token (JWT) signature verification & generation for authentication |
| **passlib[bcrypt]** | `1.7.4` | Helper library for secure password hashing and verification |
| **bcrypt** | `4.2.1` | Secure password-hashing backend for encryption |
| **python-multipart** | `0.0.17` | Form parser support (essential for key/value login formats in FastAPI) |
| **pydantic-settings** | `2.6.1` | Environments and configuration settings loader powered by Pydantic |
| **scikit-learn** | `1.5.2` | Machine learning package powering the dynamic text classifier model |
| **numpy** | `2.1.3` | Multi-dimensional numerical array container used by scikit-learn |
| **httpx** | `0.28.1` | Modern asynchronous HTTP client for Python |
| **email-validator** | `2.2.0` | Validation check for email addresses in registration modules |

---

## 📦 Frontend Dependencies (npm)
These packages are listed in [frontend/package.json](file:///c:/Users/snakhate/Downloads/chatbot/frontend/package.json):

### Production Dependencies
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **react** | `^18.3.1` | Core UI view layout library |
| **react-dom** | `^18.3.1` | DOM renderer for mounting React components to the web pages |
| **react-router-dom** | `^7.1.1` | Routing wrapper mapping URL paths to Pages |
| **recharts** | `^2.15.0` | Elegant SVG charting library for presenting expense analytics |
| **axios** | `^1.7.9` | Promise-based client for fetching and updating database state via the backend API |

### Development Dependencies
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **vite** | `^6.0.6` | Rapid frontend build tool and dev server |
| **@vitejs/plugin-react** | `^4.3.4` | Fast Refresh plugin enabling instant styling and JS state hot-reloading |

---

## 🚀 Step-by-Step Setup Instructions

Choose **Method A** (using the automated Windows batch script) or **Method B** (manual terminal execution).

### Method A: Automated Setup (Windows)
Run the following script to automate setting up the virtual environment, installing Python modules, and installing npm packages in one step:

1. Double-click or run `install_dependencies.bat` (created at the root of the project).
2. It will automatically check for Python, set up the virtual environment, install requirements, and run `npm install`.

---

### Method B: Manual Setup (Any OS)

#### 1. Setup Backend (Python)
Navigate to the `backend` directory in your terminal:
```bash
cd backend
```

Create a Python virtual environment:
```bash
# Windows
python -m venv .venv

# macOS/Linux
python3 -m venv .venv
```

Activate the virtual environment:
```bash
# Windows (Command Prompt)
.venv\Scripts\activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

---

#### 2. Setup Frontend (npm)
Navigate to the `frontend` directory in your terminal:
```bash
cd ../frontend
```

Install the npm packages:
```bash
npm install
```

---

## 🏃 Running the Application

To start the project, open **two separate terminal windows**:

### Terminal 1: Backend
```bash
cd backend
# Activate virtual environment (.venv)
.venv\Scripts\activate   # (Windows)
source .venv/bin/activate # (macOS/Linux)

# Run FastAPI Server
uvicorn main:app --reload
```
*The backend server will run at `http://127.0.0.1:8000`*

### Terminal 2: Frontend
```bash
cd frontend
# Run Vite Development Server
npm run dev
```
*The frontend application will run at `http://localhost:5173`*
