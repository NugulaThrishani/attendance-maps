# KL University Attendance System


A face recognition-based attendance system with Wi-Fi verification for KL University. The system uses real-time face recognition with liveness detection and network-based location verification.


## Features

- ✨ **Real Face Recognition** - Using DeepFace with FaceNet512 model
- 🔒 **Liveness Detection** - Prevents photo/video spoofing
- 📱 **Wi-Fi Verification** - Location verification via network
- 🔐 **JWT Authentication** - Secure token-based auth
- 🗄️ **Supabase Backend** - Scalable database with pgvector
- ⚡ **Next.js Frontend** - Modern React-based UI
- 📊 **Admin Dashboard** - Attendance monitoring & analytics
  

## Project Structure

```
attendance-system/
├── backend/               # FastAPI Backend
│   ├── app/              # Main application code
│   │   ├── core/         # Core functionality
│   │   ├── models/       # Data models
│   │   ├── routers/      # API routes
│   │   └── services/     # Business logic
│   ├── main.py          # Entry point
│   └── requirements.txt  # Python dependencies
│
└── frontend/            # Next.js Frontend
    ├── app/            # Next.js 14 app directory
    ├── components/     # React components
    └── lib/           # Utility functions
```


## Prerequisites

- Python 3.8+ (3.10 recommended)
- Node.js 18+ (LTS)
- PostgreSQL (via Supabase)
- Visual Studio Build Tools (Windows) or build-essential (Linux)
  

## Backend Setup

1. Create and activate Python virtual environment:
```powershell
# Windows
cd attendance-system/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1


# Linux/macOS
cd attendance-system/backend
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:
```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

Note: On Windows, if you encounter build errors with packages like `dlib`, consider:
- Installing Visual C++ Build Tools
- Using WSL (Windows Subsystem for Linux)
- Using Docker (recommended for consistent environments)

3. Configure environment:
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Supabase credentials
# Required variables:
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET_KEY=your_secure_jwt_secret
```

4. Run the backend server:
```bash
# Development with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or simply
python main.py
```

The API will be available at http://localhost:8000 with docs at http://localhost:8000/docs

### Docker Alternative (Recommended for Windows)

```bash
# Build container
docker build -t klu-attendance-backend .

# Run with env file
docker run -p 8000:8000 --env-file .env klu-attendance-backend
```

## Frontend Setup

1. Install Node.js dependencies:
```bash
cd attendance-system/frontend
npm install
```

2. Configure environment:
```bash
# Copy example env file
cp .env.example .env.local

# Set required variables:
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:3000

4. For production:
```bash
npm run build
npm start
```

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Common Issues & Solutions

### Backend

1. **ModuleNotFoundError: No module named 'jose'**
   ```bash
   pip install python-jose[cryptography]
   ```

2. **Face Recognition Dependencies**
   - Windows: Install Visual C++ Build Tools
   - Linux: `sudo apt-get install build-essential cmake`

3. **Database Connection Issues**
   - Verify Supabase credentials in .env
   - Run `python deploy_database.py` to initialize tables

### Frontend

1. **Build Errors**
   ```bash
   # Clear next.js cache
   rm -rf .next
   npm run build
   ```

2. **API Connection Issues**
   - Check if backend is running
   - Verify NEXT_PUBLIC_API_URL in .env.local

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- KL University for project support
- Supabase for database infrastructure
- DeepFace for face recognition capabilities
