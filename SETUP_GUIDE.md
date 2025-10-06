# ProjectHub Setup Guide

Complete guide to set up ProjectHub on your local machine.

## Quick Start (Automated Setup)

For a fully automated setup, run:

```bash
chmod +x setup.sh
./setup.sh
```

The script will:
- ✅ Check and install all required dependencies
- ✅ Set up PostgreSQL database
- ✅ Create environment files with secure secrets
- ✅ Install all project dependencies
- ✅ Run database migrations
- ✅ Optionally seed sample data
- ✅ Create a convenient start script

## Manual Setup

If you prefer to set up manually or the automated script fails:

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Redis** (optional but recommended) ([Download](https://redis.io/download))
- **Python** 3.11+ (for embedding service) ([Download](https://www.python.org/downloads/))

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd ProjectHub-backend
```

### Step 2: Install Dependencies

#### Backend
```bash
npm install
```

#### Frontend
```bash
cd frontend
npm install
cd ..
```

#### Embedding Service
```bash
cd embedding-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ..
```

### Step 3: Setup Database

```bash
# Create PostgreSQL database
psql -U postgres

# In psql:
CREATE DATABASE fyp_platform;
CREATE USER user WITH PASSWORD '';
GRANT ALL PRIVILEGES ON DATABASE fyp_platform TO user;
\q
```

### Step 4: Environment Configuration

#### Backend (.env)

```bash
cp .env.example .env
```

Edit `.env` and update:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=user
DATABASE_PASSWORD=
DATABASE_NAME=fyp_platform

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Application
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Configuration (optional)
HUGGING_FACE_API_KEY=your-api-key-here
USE_LOCAL_EMBEDDINGS=true
LOCAL_EMBEDDING_SERVICE_URL=http://localhost:8001
```

**Generate secure JWT secrets:**
```bash
# macOS/Linux
openssl rand -base64 32
```

#### Frontend (frontend/.env.local)

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

#### Embedding Service (symlink)

```bash
ln -s ../.env embedding-service/.env
```

### Step 5: Run Migrations

```bash
npm run migration:run
```

### Step 6: Seed Database (Optional)

```bash
npm run seed
```

This creates sample users:
- **Admin**: admin@university.edu / password
- **Supervisor**: supervisor@university.edu / password
- **Student**: student@university.edu / password

### Step 7: Start Services

#### Option A: Start All Services (Recommended)

```bash
./start.sh
```

#### Option B: Start Individually

**Terminal 1 - Backend:**
```bash
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Embedding Service (Optional):**
```bash
cd embedding-service
source venv/bin/activate
python main.py
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api
- **Embedding Service**: http://localhost:8001

## Troubleshooting

### PostgreSQL Connection Issues

**Error**: `ECONNREFUSED` or `password authentication failed`

**Solution**:
```bash
# Check if PostgreSQL is running
# macOS:
brew services list
brew services start postgresql@15

# Linux:
sudo systemctl status postgresql
sudo systemctl start postgresql

# Verify connection
psql -U postgres -d fyp_platform
```

### Port Already in Use

**Error**: `Port 3000/3001 is already in use`

**Solution**:
```bash
# Find and kill process using the port
# macOS/Linux:
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Or change ports in .env files
```

### Node Modules Issues

**Error**: Module not found or dependency issues

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Migration Errors

**Error**: Migration fails or tables not created

**Solution**:
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE fyp_platform;"
psql -U postgres -c "CREATE DATABASE fyp_platform;"

# Run migrations again
npm run migration:run
```

### WebSocket Connection Errors

**Error**: `JsonWebTokenError: invalid signature`

**Solution**:
1. Clear browser localStorage (DevTools > Application > Local Storage > Clear All)
2. Log out and log back in
3. Ensure JWT_SECRET hasn't changed in .env

### Python/Embedding Service Issues

**Error**: Module not found or import errors

**Solution**:
```bash
cd embedding-service
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Development Commands

### Backend

```bash
npm run start:dev      # Start development server
npm run build          # Build for production
npm run start:prod     # Start production server
npm run test           # Run tests
npm run migration:generate  # Generate new migration
npm run migration:run       # Run migrations
npm run migration:revert    # Revert last migration
```

### Frontend

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run linter
npm run test           # Run tests
```

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| DATABASE_HOST | PostgreSQL host | localhost | Yes |
| DATABASE_PORT | PostgreSQL port | 5432 | Yes |
| DATABASE_USERNAME | Database user | user | Yes |
| DATABASE_PASSWORD | Database password | | Yes |
| DATABASE_NAME | Database name | fyp_platform | Yes |
| JWT_SECRET | JWT signing secret | | Yes |
| JWT_REFRESH_SECRET | Refresh token secret | | Yes |
| PORT | Backend port | 3001 | Yes |
| FRONTEND_URL | Frontend URL | http://localhost:3000 | Yes |
| REDIS_HOST | Redis host | localhost | No |
| REDIS_PORT | Redis port | 6379 | No |
| USE_LOCAL_EMBEDDINGS | Use local embedding service | false | No |
| HUGGING_FACE_API_KEY | HuggingFace API key | | No |

### Frontend (frontend/.env.local)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:3001 | Yes |
| NEXT_PUBLIC_WS_URL | WebSocket URL | http://localhost:3001 | Yes |

## Project Structure

```
ProjectHub-backend/
├── src/                    # Backend source code
│   ├── controllers/        # API controllers
│   ├── services/          # Business logic
│   ├── entities/          # Database entities
│   ├── dto/               # Data transfer objects
│   └── migrations/        # Database migrations
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   ├── stores/       # State management
│   │   └── lib/          # Utilities
│   └── public/           # Static assets
├── embedding-service/     # Python embedding service
├── scripts/              # Utility scripts
├── .env                  # Backend environment
├── setup.sh              # Automated setup script
└── start.sh              # Start all services
```

## Next Steps

1. **Explore the Application**
   - Log in with seeded credentials
   - Browse projects
   - Test AI assistant
   - Create bookmarks

2. **Customize Configuration**
   - Update email settings for notifications
   - Configure AI service (HuggingFace or local)
   - Set up production database

3. **Development**
   - Read API documentation at http://localhost:3001/api
   - Check FRONTEND_DEVELOPMENT_SUMMARY.md
   - Review API_QUICK_REFERENCE.md

## Support

For issues and questions:
1. Check this guide's Troubleshooting section
2. Review error logs in terminal
3. Check browser console for frontend errors
4. Verify all services are running

## Security Notes

⚠️ **Important for Production:**

1. Change all default passwords
2. Use strong, unique JWT secrets
3. Enable HTTPS
4. Configure proper CORS settings
5. Set up proper database backups
6. Use environment-specific .env files
7. Never commit .env files to git

## License

[Your License Here]
