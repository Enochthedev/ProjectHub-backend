# 🚀 ProjectHub - One Command Setup

Get ProjectHub running on your laptop in under 5 minutes with zero configuration!

## ⚡ Super Quick Start (Recommended)

**One command to rule them all:**

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/quick-setup.sh | bash
```

Or if you prefer to clone first:

```bash
git clone <repository-url>
cd ProjectHub-backend
./setup.sh
```

That's it! The script will:

- ✅ Install all dependencies (Node.js, PostgreSQL, Redis, Python, Docker)
- ✅ Set up databases and environment files
- ✅ Install project dependencies
- ✅ Run migrations and seed sample data
- ✅ Create a start script for easy development

## 🎯 What You Get

After setup completes, run:

```bash
./start.sh
```

Then access:

- **🌐 Frontend**: <http://localhost:3000>
- **🔧 Backend API**: <http://localhost:3001>
- **📚 API Docs**: <http://localhost:3001/api>
- **🤖 AI Embeddings**: <http://localhost:8001>

## 🔑 Default Login Credentials

The setup automatically creates these test accounts:

| Role           | Email                     | Password |
| -------------- | ------------------------- | -------- |
| **Admin**      | admin@university.edu      | password |
| **Supervisor** | supervisor@university.edu | password |
| **Student**    | student@university.edu    | password |

## 🛠️ What Gets Installed

The setup script automatically installs:

### System Dependencies

- **Node.js 20 LTS** - JavaScript runtime
- **PostgreSQL 15** - Main database
- **Redis** - Caching and sessions
- **Python 3.11** - For AI embedding service
- **Docker** - For Qdrant vector database

### Project Components

- **Backend API** - NestJS application
- **Frontend** - Next.js React application
- **Embedding Service** - Python AI service
- **Vector Database** - Qdrant for AI features

## 🔧 Environment Configuration

The setup creates these files with sensible defaults:

- `.env` - Backend configuration
- `frontend/.env.local` - Frontend configuration
- `embedding-service/.env` - AI service configuration

### 🔑 API Keys (Optional but Recommended)

For full AI features, add these to your `.env` file:

```bash
# AI Services (get free keys)
OPENROUTER_API_KEY=your-openrouter-key        # Free tier: https://openrouter.ai
HUGGING_FACE_API_KEY=your-huggingface-key     # Free tier: https://huggingface.co

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 🚨 Troubleshooting

### Setup Issues

**"Command not found" errors:**

```bash
# On macOS, install Homebrew first:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then run setup again:
./setup.sh
```

**PostgreSQL connection failed:**

```bash
# Restart PostgreSQL:
brew services restart postgresql@15

# Or check if it's running:
brew services list | grep postgresql
```

**Port already in use:**

```bash
# Kill processes on common ports:
lsof -ti:3000,3001,5432,6379 | xargs kill -9

# Then restart:
./start.sh
```

### Runtime Issues

**Services won't start:**

```bash
# Check what's running:
./start.sh

# Restart individual services:
npm run start:dev          # Backend only
cd frontend && npm run dev  # Frontend only
```

**Database issues:**

```bash
# Reset database:
npm run seed:rollback
npm run migration:run
npm run seed
```

## 🎯 Development Workflow

### Daily Development

```bash
./start.sh                    # Start all services
# Code, test, repeat...
# Ctrl+C to stop all services
```

### Useful Commands

```bash
# Backend
npm run start:dev             # Start backend with hot reload
npm run test                  # Run tests
npm run migration:generate    # Create new migration
npm run seed                  # Seed database

# Frontend
cd frontend
npm run dev                   # Start with hot reload
npm run build                 # Build for production
npm run test                  # Run tests

# Database
npm run migration:run         # Apply migrations
npm run seed:rollback         # Reset data
```

## 🌟 Features Ready to Use

After setup, you can immediately:

- ✅ Create and manage FYP projects
- ✅ Assign supervisors and students
- ✅ Track project milestones
- ✅ Use AI-powered recommendations
- ✅ Real-time notifications
- ✅ Document management
- ✅ Progress tracking
- ✅ Admin dashboard

## 🚀 Production Deployment

Ready for production? Check out:

- `DEPLOYMENT.md` - Production deployment guide
- `RENDER_SETUP.md` - Deploy to Render.com
- `docker-compose.yml` - Docker deployment

## 🆘 Need Help?

1. **Check the logs** - Most issues show up in terminal output
2. **Review full docs** - See `SETUP_GUIDE.md` for detailed setup
3. **Common issues** - Check `KNOWN_ISSUES.md`
4. **Create an issue** - GitHub issues for bugs/questions

## 🎉 You're All Set!

Your ProjectHub instance is ready! Start by:

1. Logging in as admin (admin@university.edu / password)
2. Creating your first project
3. Exploring the AI features
4. Setting up your team

Happy coding! 🚀
