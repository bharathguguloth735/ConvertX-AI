# 🚀 ConvertX AI (DocuFlow AI)

[![CI/CD Pipeline](https://github.com/bharathguguloth735/ConvertX-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/bharathguguloth735/ConvertX-AI/actions)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-3776AB.svg)](https://www.python.org/)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)]()

> **ConvertX AI** is a production-hardened, all-in-one platform for high-performance file conversion, document editing, compression, OCR, and AI-powered document understanding.

---

## 🌟 Features Overview

### 📄 PDF Powerhouse
- **Conversions**: PDF to DOCX, PPTX, Excel, Images, Markdown, and TXT.
- **Manipulation**: Merge, Split, Compress, Rotate, Protect (AES-256), Unlock, Watermark, Delete Pages, Extract Pages, and Add Page Numbers.
- **Image-to-PDF**: Drag-and-drop batch image compilation into PDF.

### 🎨 Media Processing
- **Image Suite**: Convert (PNG, JPG, WebP, TIFF, GIF, BMP), Crop, Resize, Compress, and Rotate.
- **Audio Suite**: MP3 Cutter, Multi-format Converter (WAV, AAC, OGG, FLAC), and Bitrate Compressor.
- **Video Suite**: Video Cutter, Video-to-MP3 Audio Extractor, and FFmpeg Compressor.

### 🌐 Social Media Media Downloader
- Download high-definition public videos and audio from **YouTube, Instagram, TikTok, Facebook, Twitter/X, and Pinterest** (powered by `yt-dlp`).

### 🤖 AI Intelligence & OCR
- **OCR Engine**: PyTesseract with dynamic fallback support for EasyOCR.
- **AI Document Analyzer**: Semantic RAG-powered document question answering, summarization, and key insight extraction.
- **AI Invoice Parser**: Extracts vendor names, line items, totals, and tax breakdowns directly to structured JSON.
- **AI Resume Analyzer**: Skills matching, score assessment, and ATS recommendations.
- **AI Multilingual Translator**: High-fidelity translation across global languages.

---

## 🏗️ Architecture & Engineering Highlights

- **Backend**: FastAPI with async SQLAlchemy 2.0 (`asyncpg` / `aiosqlite`), Redis-backed Celery worker queues, and `pgvector` compatibility.
- **Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS, Zustand, and TanStack React Query.
- **Code-Splitting**: Modular chunking using dynamic `React.lazy()` with sub-180kB initial entry bundle.
- **Security**: Strict canonical path traversal boundaries (`os.path.commonpath`), HMAC-SHA256 temporary access tokens, bcrypt password hashing, and JWT session handling.
- **Rate Limiting**: Atomic Redis sliding-window with automatic in-memory fallback.
- **Automated Lifecycle**: Celery Beat scheduled worker purging files older than 24 hours.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- FFmpeg (for audio/video tools)
- Tesseract OCR (for OCR features)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Documentation: `http://localhost:8000/docs`  
Health Check: `http://localhost:8000/health/ready`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Client App: `http://localhost:5175`

### 3. Docker Compose (Full Stack)
```bash
docker-compose up --build
```

---

## 🧪 Testing Suite

### Backend Unit & Security Tests
```bash
cd backend
pytest -v
```

### Frontend Unit Tests (Vitest)
```bash
cd frontend
npm test
```

### End-to-End Browser Tests (Playwright)
```bash
cd frontend
npm run test:e2e
```

---

## 🛡️ License & Author
Created by **Guguloth Bharath** ([@bharathguguloth735](https://github.com/bharathguguloth735)).  
Licensed under the [MIT License](LICENSE).
