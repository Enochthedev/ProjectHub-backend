# ProjectHub - Quick Start

Get ProjectHub running on your machine in 5 minutes!

## One-Command Setup

```bash
chmod +x setup.sh && ./setup.sh
```

That's it! The script will handle everything automatically.

## What Gets Installed

The setup script will check and install:
- ✅ Node.js (if not installed)
- ✅ PostgreSQL (if not installed)
- ✅ Redis (optional, will ask)
- ✅ Python 3 (if not installed)
- ✅ All project dependencies
- ✅ Database with migrations
- ✅ Environment files with secure secrets

## After Setup

Start all services:
```bash
./start.sh
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **API Docs**: http://localhost:3001/api

## Default Login

If you seeded the database:
- **Student**: student@university.edu / password
- **Supervisor**: supervisor@university.edu / password
- **Admin**: admin@university.edu / password

## Need Help?

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions and troubleshooting.

## Manual Setup

If the automated script doesn't work:

1. **Install Prerequisites**
   - Node.js 18+
   - PostgreSQL 15+
   - Python 3.11+

2. **Setup Database**
   ```bash
   psql -U postgres -c "CREATE DATABASE fyp_platform;"
   ```

3. **Install Dependencies**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   # Edit .env files with your settings
   ```

5. **Run Migrations**
   ```bash
   npm run migration:run
   ```

6. **Start Services**
   ```bash
   # Terminal 1
   npm run start:dev
   
   # Terminal 2
   cd frontend && npm run dev
   ```

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed
```bash
# Start PostgreSQL
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux
```

### Clear Browser Data
If you see JWT errors:
1. Open DevTools (F12)
2. Application > Local Storage > Clear All
3. Log out and log back in

## What's Next?

- 📚 Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed documentation
- 🎨 Check [FRONTEND_DEVELOPMENT_SUMMARY.md](./FRONTEND_DEVELOPMENT_SUMMARY.md)
- 🔌 Review [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md)
- 🐛 See [FINAL_FIXES_SUMMARY.md](./FINAL_FIXES_SUMMARY.md) for recent fixes

Happy coding! 🚀
