# Setup Scripts Summary

Complete automated setup system for ProjectHub.

## Files Created

### 1. setup.sh
**Automated setup script** that handles everything from scratch.

**Features:**
- ✅ Detects operating system (macOS/Linux)
- ✅ Checks and installs all dependencies
- ✅ Sets up PostgreSQL database
- ✅ Creates environment files with secure secrets
- ✅ Uses symlinks for shared environment variables
- ✅ Installs all project dependencies
- ✅ Runs database migrations
- ✅ Optionally seeds sample data
- ✅ Creates convenient start script
- ✅ Provides clear success/error messages

**Usage:**
```bash
chmod +x setup.sh
./setup.sh
```

### 2. start.sh
**Convenience script** to start all services at once.

**Features:**
- Starts backend (NestJS)
- Starts frontend (Next.js)
- Starts embedding service (Python)
- Shows service URLs
- Handles graceful shutdown (Ctrl+C)

**Usage:**
```bash
./start.sh
```

### 3. QUICKSTART.md
**5-minute quick start guide** for new users.

**Contents:**
- One-command setup
- What gets installed
- Default credentials
- Quick troubleshooting
- Links to detailed docs

### 4. SETUP_GUIDE.md
**Comprehensive setup documentation** with manual steps.

**Contents:**
- Prerequisites
- Step-by-step manual setup
- Environment variable reference
- Troubleshooting guide
- Development commands
- Project structure
- Security notes

### 5. Updated README.md
**Main project README** with quick start section.

**Added:**
- Quick start section at top
- Links to setup guides
- Clear call-to-action for new users

## Environment File Strategy

### Symlinks for Shared Configuration

The setup uses symlinks to avoid duplication:

```
.env (main backend config)
  ↓ symlinked to
embedding-service/.env
```

**Benefits:**
- Single source of truth
- No duplicate configuration
- Automatic sync across services
- Easier maintenance

### Separate Frontend Config

Frontend has its own `.env.local` because:
- Different variables (NEXT_PUBLIC_*)
- Client-side vs server-side
- Security (no backend secrets exposed)

## What the Setup Script Does

### 1. System Check
```bash
✓ Detects OS (macOS/Linux)
✓ Checks for required commands
```

### 2. Dependency Installation
```bash
✓ Homebrew (macOS only)
✓ Node.js 18+
✓ PostgreSQL 15+
✓ Redis (optional)
✓ Python 3.11+
```

### 3. Database Setup
```bash
✓ Creates database: fyp_platform
✓ Creates user: user
✓ Grants permissions
```

### 4. Environment Configuration
```bash
✓ Copies .env.example → .env
✓ Generates secure JWT secrets
✓ Creates frontend/.env.local
✓ Symlinks embedding-service/.env
```

### 5. Project Dependencies
```bash
✓ Backend: npm install
✓ Frontend: npm install
✓ Embedding: pip install -r requirements.txt
```

### 6. Database Migrations
```bash
✓ Runs all migrations
✓ Creates tables and schema
```

### 7. Optional Seeding
```bash
✓ Asks user if they want sample data
✓ Creates test users and projects
```

### 8. Start Script
```bash
✓ Creates start.sh
✓ Makes it executable
```

## Security Features

### Secure Secret Generation

The script generates cryptographically secure secrets:

```bash
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
```

**Result:** 256-bit random secrets for production-grade security.

### No Hardcoded Credentials

- Database password is empty by default (local dev)
- JWT secrets are randomly generated
- API keys must be added manually
- No secrets committed to git

## Error Handling

The script includes robust error handling:

```bash
set -e  # Exit on any error
```

**Features:**
- Colored output (info, success, warning, error)
- Clear error messages
- Graceful degradation
- Rollback on failure

## Platform Support

### macOS
- Uses Homebrew for package management
- Handles macOS-specific paths
- Uses BSD sed syntax

### Linux
- Uses apt-get for package management
- Handles systemd services
- Uses GNU sed syntax

### Windows
Not directly supported, but users can:
- Use WSL2 (Windows Subsystem for Linux)
- Follow manual setup guide
- Use Docker

## Usage Examples

### Fresh Install
```bash
# Clone repo
git clone <repo-url>
cd ProjectHub-backend

# Run setup
chmod +x setup.sh
./setup.sh

# Start services
./start.sh
```

### Existing Installation
```bash
# Update dependencies
npm install
cd frontend && npm install && cd ..

# Run migrations
npm run migration:run

# Start services
./start.sh
```

### Development Workflow
```bash
# Start all services
./start.sh

# Or start individually
npm run start:dev              # Backend
cd frontend && npm run dev     # Frontend
```

## Troubleshooting

### Setup Script Fails

**Check logs:**
```bash
./setup.sh 2>&1 | tee setup.log
```

**Common issues:**
- Permission denied → Run with proper permissions
- Command not found → Install missing dependency manually
- Database error → Check PostgreSQL is running

### Services Won't Start

**Check ports:**
```bash
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
```

**Check services:**
```bash
brew services list              # macOS
sudo systemctl status postgresql # Linux
```

### Environment Issues

**Regenerate secrets:**
```bash
openssl rand -base64 32
```

**Check symlinks:**
```bash
ls -la embedding-service/.env
# Should show: .env -> ../.env
```

## Maintenance

### Updating Dependencies

```bash
# Backend
npm update

# Frontend
cd frontend && npm update

# Embedding service
cd embedding-service
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

### Database Migrations

```bash
# Create new migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Best Practices

### For New Users
1. Run automated setup first
2. Check QUICKSTART.md
3. Use start.sh for convenience
4. Read SETUP_GUIDE.md if issues occur

### For Developers
1. Keep .env.example updated
2. Document new environment variables
3. Test setup script on clean system
4. Update SETUP_GUIDE.md with changes

### For Production
1. Use strong, unique secrets
2. Don't use setup script in production
3. Follow deployment guides
4. Use environment-specific configs

## Future Improvements

Potential enhancements:
- [ ] Windows native support
- [ ] Docker-based setup option
- [ ] Cloud deployment scripts
- [ ] Automated testing of setup
- [ ] Configuration wizard
- [ ] Health check after setup
- [ ] Backup/restore scripts

## Summary

The setup system provides:
- ✅ **Automated setup** - One command to rule them all
- ✅ **Manual fallback** - Detailed guide if automation fails
- ✅ **Quick start** - 5-minute guide for impatient devs
- ✅ **Security** - Secure secret generation
- ✅ **Convenience** - Start script for all services
- ✅ **Documentation** - Comprehensive guides
- ✅ **Error handling** - Clear messages and recovery
- ✅ **Platform support** - macOS and Linux

**Result:** Anyone can get ProjectHub running on their machine with minimal effort!
