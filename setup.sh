#!/bin/bash

# ProjectHub Setup Script
# This script sets up the entire ProjectHub system on a fresh machine

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║              ProjectHub Setup Script                      ║"
    echo "║         University FYP Management System                  ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_system() {
    log_info "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_success "Detected macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        log_success "Detected Linux"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Install Homebrew (macOS)
install_homebrew() {
    if [[ "$OS" == "macos" ]] && ! command_exists brew; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        log_success "Homebrew installed"
    fi
}

# Install Node.js
install_node() {
    if ! command_exists node; then
        log_info "Installing Node.js..."
        
        if [[ "$OS" == "macos" ]]; then
            brew install node
        elif [[ "$OS" == "linux" ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        log_success "Node.js installed: $(node --version)"
    else
        log_success "Node.js already installed: $(node --version)"
    fi
}

# Install PostgreSQL
install_postgresql() {
    if ! command_exists psql; then
        log_info "Installing PostgreSQL..."
        
        if [[ "$OS" == "macos" ]]; then
            brew install postgresql@15
            brew services start postgresql@15
        elif [[ "$OS" == "linux" ]]; then
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        fi
        
        log_success "PostgreSQL installed"
    else
        log_success "PostgreSQL already installed"
    fi
}

# Install Redis (optional but recommended)
install_redis() {
    if ! command_exists redis-cli; then
        log_warning "Redis not found. Installing Redis (optional but recommended)..."
        
        read -p "Install Redis? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ "$OS" == "macos" ]]; then
                brew install redis
                brew services start redis
            elif [[ "$OS" == "linux" ]]; then
                sudo apt-get install -y redis-server
                sudo systemctl start redis
                sudo systemctl enable redis
            fi
            log_success "Redis installed"
        else
            log_warning "Skipping Redis installation"
        fi
    else
        log_success "Redis already installed"
    fi
}

# Install Python (for embedding service)
install_python() {
    if ! command_exists python3; then
        log_info "Installing Python 3..."
        
        if [[ "$OS" == "macos" ]]; then
            brew install python@3.11
        elif [[ "$OS" == "linux" ]]; then
            sudo apt-get install -y python3 python3-pip python3-venv
        fi
        
        log_success "Python installed: $(python3 --version)"
    else
        log_success "Python already installed: $(python3 --version)"
    fi
}

# Setup PostgreSQL database
setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    DB_NAME="fyp_platform"
    DB_USER="user"
    DB_PASSWORD=""
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_warning "Database '$DB_NAME' already exists"
        read -p "Drop and recreate database? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -U postgres -c "CREATE DATABASE $DB_NAME;"
            log_success "Database recreated"
        fi
    else
        psql -U postgres -c "CREATE DATABASE $DB_NAME;"
        log_success "Database '$DB_NAME' created"
    fi
    
    # Create user if doesn't exist
    if ! psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        log_success "Database user created"
    else
        log_success "Database user already exists"
    fi
}

# Setup environment files
setup_env_files() {
    log_info "Setting up environment files..."
    
    # Backend .env
    if [ ! -f ".env" ]; then
        log_info "Creating backend .env file..."
        cp .env.example .env
        
        # Generate random JWT secrets
        JWT_SECRET=$(openssl rand -base64 32)
        JWT_REFRESH_SECRET=$(openssl rand -base64 32)
        
        # Update .env with generated secrets
        if [[ "$OS" == "macos" ]]; then
            sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
            sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|g" .env
        else
            sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
            sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|g" .env
        fi
        
        log_success "Backend .env created with secure JWT secrets"
    else
        log_warning "Backend .env already exists, skipping..."
    fi
    
    # Frontend .env.local
    if [ ! -f "frontend/.env.local" ]; then
        log_info "Creating frontend .env.local file..."
        
        # Create symlink to backend .env for shared variables
        if [ -f "frontend/.env.example" ]; then
            cp frontend/.env.example frontend/.env.local
            log_success "Frontend .env.local created"
        else
            # Create minimal frontend env
            cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
EOF
            log_success "Frontend .env.local created"
        fi
    else
        log_warning "Frontend .env.local already exists, skipping..."
    fi
    
    # Embedding service .env (symlink to backend .env)
    if [ ! -f "embedding-service/.env" ]; then
        log_info "Creating symlink for embedding service .env..."
        ln -s ../.env embedding-service/.env
        log_success "Embedding service .env symlinked"
    else
        log_warning "Embedding service .env already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing project dependencies..."
    
    # Backend dependencies
    log_info "Installing backend dependencies..."
    npm install
    log_success "Backend dependencies installed"
    
    # Frontend dependencies
    log_info "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    log_success "Frontend dependencies installed"
    
    # Embedding service dependencies
    log_info "Installing embedding service dependencies..."
    cd embedding-service
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
    cd ..
    log_success "Embedding service dependencies installed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    npm run migration:run
    log_success "Database migrations completed"
}

# Seed database (optional)
seed_database() {
    log_warning "Would you like to seed the database with sample data?"
    read -p "Seed database? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Seeding database..."
        npm run seed
        log_success "Database seeded with sample data"
    else
        log_info "Skipping database seeding"
    fi
}

# Create start script
create_start_script() {
    log_info "Creating start script..."
    
    cat > start.sh << 'EOF'
#!/bin/bash

# Start all ProjectHub services

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting ProjectHub services...${NC}"

# Start backend
echo -e "${GREEN}Starting backend...${NC}"
npm run start:dev &
BACKEND_PID=$!

# Start frontend
echo -e "${GREEN}Starting frontend...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

# Start embedding service (optional)
echo -e "${GREEN}Starting embedding service...${NC}"
cd embedding-service
source venv/bin/activate
python main.py &
EMBEDDING_PID=$!
deactivate
cd ..

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "Embedding: http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID $EMBEDDING_PID 2>/dev/null; exit" INT
wait
EOF
    
    chmod +x start.sh
    log_success "Start script created (./start.sh)"
}

# Print final instructions
print_instructions() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║              Setup Complete! 🎉                           ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo "1. Review and update environment variables:"
    echo "   - Backend:  .env"
    echo "   - Frontend: frontend/.env.local"
    echo ""
    echo "2. Start all services:"
    echo "   ${GREEN}./start.sh${NC}"
    echo ""
    echo "   Or start individually:"
    echo "   - Backend:  ${GREEN}npm run start:dev${NC}"
    echo "   - Frontend: ${GREEN}cd frontend && npm run dev${NC}"
    echo "   - Embedding: ${GREEN}cd embedding-service && source venv/bin/activate && python main.py${NC}"
    echo ""
    echo "3. Access the application:"
    echo "   - Frontend: ${BLUE}http://localhost:3000${NC}"
    echo "   - Backend API: ${BLUE}http://localhost:3001${NC}"
    echo "   - API Docs: ${BLUE}http://localhost:3001/api${NC}"
    echo ""
    echo "4. Default credentials (if seeded):"
    echo "   - Admin: admin@university.edu / password"
    echo "   - Supervisor: supervisor@university.edu / password"
    echo "   - Student: student@university.edu / password"
    echo ""
    echo -e "${YELLOW}Note: Make sure PostgreSQL and Redis are running!${NC}"
    echo ""
}

# Main setup flow
main() {
    print_banner
    
    log_info "Starting ProjectHub setup..."
    echo ""
    
    # System checks
    check_system
    
    # Install dependencies
    install_homebrew
    install_node
    install_postgresql
    install_redis
    install_python
    
    echo ""
    log_info "System dependencies installed!"
    echo ""
    
    # Setup database
    setup_database
    
    # Setup environment files
    setup_env_files
    
    # Install project dependencies
    install_dependencies
    
    # Run migrations
    run_migrations
    
    # Seed database
    seed_database
    
    # Create start script
    create_start_script
    
    # Print instructions
    print_instructions
    
    log_success "Setup completed successfully!"
}

# Run main function
main
