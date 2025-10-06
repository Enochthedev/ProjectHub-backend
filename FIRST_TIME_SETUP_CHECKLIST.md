# First Time Setup Checklist

Complete checklist for setting up ProjectHub on your machine.

## ✅ Pre-Setup Checklist

Before running the setup script:

- [ ] **Git installed** - `git --version`
- [ ] **Terminal access** - Command line ready
- [ ] **Internet connection** - For downloading dependencies
- [ ] **Admin/sudo access** - May be needed for installations
- [ ] **Disk space** - At least 2GB free

## ✅ Automated Setup (Recommended)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd ProjectHub-backend
```
- [ ] Repository cloned successfully
- [ ] In correct directory

### Step 2: Run Setup Script
```bash
chmod +x setup.sh
./setup.sh
```
- [ ] Script has execute permissions
- [ ] Script completed without errors
- [ ] All dependencies installed
- [ ] Database created
- [ ] Environment files created
- [ ] Migrations ran successfully

### Step 3: Review Configuration
```bash
# Check backend .env
cat .env

# Check frontend .env.local
cat frontend/.env.local
```
- [ ] JWT secrets are generated (not default values)
- [ ] Database credentials are correct
- [ ] Frontend URLs point to localhost:3001
- [ ] No placeholder values remain

### Step 4: Start Services
```bash
./start.sh
```
- [ ] Backend started on port 3001
- [ ] Frontend started on port 3000
- [ ] Embedding service started on port 8001
- [ ] No error messages in console

### Step 5: Verify Installation
Open browser and check:
- [ ] Frontend loads: http://localhost:3000
- [ ] Backend API responds: http://localhost:3001/health
- [ ] API docs load: http://localhost:3001/api

### Step 6: Test Login
If database was seeded:
- [ ] Can access login page
- [ ] Can log in as student (student@university.edu / password)
- [ ] Dashboard loads correctly
- [ ] No console errors

## ✅ Manual Setup (If Automated Fails)

### Prerequisites
- [ ] Node.js 18+ installed - `node --version`
- [ ] PostgreSQL 15+ installed - `psql --version`
- [ ] Python 3.11+ installed - `python3 --version`
- [ ] Redis installed (optional) - `redis-cli --version`

### Database Setup
```bash
psql -U postgres
```
- [ ] PostgreSQL is running
- [ ] Can connect to PostgreSQL
- [ ] Database `fyp_platform` created
- [ ] User `user` created with permissions

### Backend Setup
```bash
npm install
```
- [ ] Dependencies installed without errors
- [ ] node_modules folder created
- [ ] No peer dependency warnings

### Frontend Setup
```bash
cd frontend
npm install
cd ..
```
- [ ] Frontend dependencies installed
- [ ] frontend/node_modules created
- [ ] No build errors

### Embedding Service Setup
```bash
cd embedding-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
```
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] No Python errors

### Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `frontend/.env.local` created
- [ ] JWT secrets generated and added
- [ ] Database credentials updated
- [ ] All required variables set

### Database Migrations
```bash
npm run migration:run
```
- [ ] Migrations completed successfully
- [ ] Tables created in database
- [ ] No migration errors

### Optional: Seed Database
```bash
npm run seed
```
- [ ] Sample data created
- [ ] Test users available
- [ ] No seeding errors

## ✅ Post-Setup Verification

### Backend Health Check
```bash
curl http://localhost:3001/health
```
Expected response:
```json
{
  "status": "ok",
  "info": { ... }
}
```
- [ ] Health endpoint responds
- [ ] Database connection OK
- [ ] Redis connection OK (if enabled)

### Frontend Check
- [ ] Page loads without errors
- [ ] No 404 errors in console
- [ ] API calls succeed
- [ ] WebSocket connects

### Database Check
```bash
psql -U user -d fyp_platform -c "\dt"
```
- [ ] All tables exist
- [ ] Schema is correct
- [ ] Can query tables

### Services Running
```bash
# Check processes
lsof -ti:3000  # Frontend
lsof -ti:3001  # Backend
lsof -ti:8001  # Embedding
```
- [ ] All ports are in use
- [ ] No port conflicts
- [ ] Services respond to requests

## ✅ Feature Testing

### Authentication
- [ ] Can register new user
- [ ] Can log in
- [ ] Can log out
- [ ] JWT token works
- [ ] Refresh token works

### Projects
- [ ] Can view projects list
- [ ] Can view project details
- [ ] Can search projects
- [ ] Can filter projects
- [ ] Pagination works

### Bookmarks
- [ ] Can bookmark project
- [ ] Can view bookmarks
- [ ] Can remove bookmark
- [ ] Bookmark persists after refresh

### AI Assistant
- [ ] Can access AI chat
- [ ] Can send message
- [ ] Receives response
- [ ] Conversation persists

### Dashboard
- [ ] Dashboard loads
- [ ] Widgets display correctly
- [ ] Data is accurate
- [ ] Navigation works

## ✅ Common Issues Resolution

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```
- [ ] Ports freed
- [ ] Services restart successfully

### Database Connection Failed
```bash
# macOS
brew services restart postgresql@15

# Linux
sudo systemctl restart postgresql
```
- [ ] PostgreSQL restarted
- [ ] Can connect to database

### JWT Errors
- [ ] Cleared browser localStorage
- [ ] Logged out and back in
- [ ] JWT_SECRET hasn't changed

### Module Not Found
```bash
rm -rf node_modules package-lock.json
npm install
```
- [ ] Clean install completed
- [ ] All modules present

## ✅ Development Environment

### IDE Setup
- [ ] Project opened in IDE
- [ ] TypeScript working
- [ ] Linting configured
- [ ] Formatting configured

### Git Configuration
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```
- [ ] Git configured
- [ ] Can commit changes
- [ ] .gitignore working

### Environment Variables
- [ ] .env not committed to git
- [ ] .env.local not committed to git
- [ ] Secrets are secure

## ✅ Documentation Review

Read these files:
- [ ] README.md - Project overview
- [ ] QUICKSTART.md - Quick start guide
- [ ] SETUP_GUIDE.md - Detailed setup
- [ ] API_QUICK_REFERENCE.md - API endpoints
- [ ] FRONTEND_DEVELOPMENT_SUMMARY.md - Frontend guide

## ✅ Next Steps

After successful setup:
- [ ] Explore the application
- [ ] Read API documentation
- [ ] Review code structure
- [ ] Set up development workflow
- [ ] Join team communication channels

## 🎉 Setup Complete!

If all items are checked, you're ready to develop!

### Quick Commands Reference

```bash
# Start all services
./start.sh

# Start individually
npm run start:dev              # Backend
cd frontend && npm run dev     # Frontend

# Run tests
npm test                       # Backend tests
cd frontend && npm test        # Frontend tests

# Database
npm run migration:run          # Run migrations
npm run migration:revert       # Revert migration
npm run seed                   # Seed database

# Build
npm run build                  # Backend
cd frontend && npm run build   # Frontend
```

### Support Resources

- 📚 Documentation: See `/docs` folder
- 🐛 Issues: Check SETUP_GUIDE.md troubleshooting
- 💬 Questions: Ask your team
- 🔧 Fixes: See FINAL_FIXES_SUMMARY.md

---

**Happy Coding! 🚀**
