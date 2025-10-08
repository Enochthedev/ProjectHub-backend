#!/bin/bash

# ProjectHub One-Command Setup Script
# This script sets up the entire ProjectHub system on a fresh machine
# Usage: curl -sSL https://raw.githubusercontent.com/your-repo/setup.sh | bash
# Or: ./setup.sh

set -e  # Exit on error

# Trap to cleanup on exit
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "Setup failed! Check the logs above for details."
        echo ""
        echo "Common issues:"
        echo "1. PostgreSQL not running - try: brew services start postgresql"
        echo "2. Permission issues - try running with sudo for system packages"
        echo "3. Node.js version - ensure Node.js 18+ is installed"
        echo ""
        echo "For help, check the README.md or create an issue on GitHub"
    fi
}
trap cleanup EXIT

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

# Check if service is running
service_running() {
    if [[ "$OS" == "macos" ]]; then
        brew services list | grep "$1" | grep -q "started"
    elif [[ "$OS" == "linux" ]]; then
        systemctl is-active --quiet "$1"
    fi
}

# Wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            log_success "$service is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service failed to start on port $port"
    return 1
}

# Check Node.js version
check_node_version() {
    if command_exists node; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        
        if [ "$major_version" -lt 18 ]; then
            log_error "Node.js version $node_version is too old. Need Node.js 18 or higher."
            log_info "Please update Node.js and run this script again."
            exit 1
        fi
        
        log_success "Node.js version $node_version is compatible"
    fi
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
        
        # Add Homebrew to PATH for current session
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
        
        log_success "Homebrew installed"
    fi
}

# Install basic utilities
install_utilities() {
    log_info "Installing basic utilities..."
    
    if [[ "$OS" == "macos" ]]; then
        # netcat is usually available on macOS, but install if missing
        if ! command_exists nc; then
            brew install netcat
        fi
    elif [[ "$OS" == "linux" ]]; then
        # Install essential utilities
        sudo apt-get update
        sudo apt-get install -y curl wget netcat-openbsd build-essential
    fi
    
    log_success "Basic utilities ready"
}

# Install Node.js
install_node() {
    if ! command_exists node; then
        log_info "Installing Node.js 20 LTS..."
        
        if [[ "$OS" == "macos" ]]; then
            # Check if we have .nvmrc and use nvm if available
            if [ -f ".nvmrc" ] && command_exists nvm; then
                log_info "Found .nvmrc, using nvm to install correct Node.js version..."
                nvm install
                nvm use
            else
                brew install node@20
                # Add to PATH if needed
                if ! command_exists node; then
                    echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
                    export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
                fi
            fi
        elif [[ "$OS" == "linux" ]]; then
            # Install Node.js 20 LTS
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        log_success "Node.js installed: $(node --version)"
    else
        log_success "Node.js already installed: $(node --version)"
    fi
    
    # Verify Node.js version
    check_node_version
}

# Install PostgreSQL
install_postgresql() {
    if ! command_exists psql; then
        log_info "Installing PostgreSQL 15..."
        
        if [[ "$OS" == "macos" ]]; then
            brew install postgresql@15
            
            # Add to PATH
            echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
            export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
            
            # Start PostgreSQL
            brew services start postgresql@15
            
            # Wait for PostgreSQL to be ready
            wait_for_service "postgresql" "5432"
            
        elif [[ "$OS" == "linux" ]]; then
            sudo apt-get update
            sudo apt-get install -y postgresql-15 postgresql-contrib-15
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            
            # Wait for PostgreSQL to be ready
            wait_for_service "postgresql" "5432"
        fi
        
        log_success "PostgreSQL installed and running"
    else
        log_success "PostgreSQL already installed"
        
        # Make sure PostgreSQL is running
        if [[ "$OS" == "macos" ]]; then
            if ! service_running "postgresql@15"; then
                log_info "Starting PostgreSQL..."
                brew services start postgresql@15
                wait_for_service "postgresql" "5432"
            fi
        elif [[ "$OS" == "linux" ]]; then
            if ! service_running "postgresql"; then
                log_info "Starting PostgreSQL..."
                sudo systemctl start postgresql
                wait_for_service "postgresql" "5432"
            fi
        fi
    fi
}

# Install Redis (optional but recommended)
install_redis() {
    if ! command_exists redis-cli; then
        log_info "Installing Redis (recommended for caching and WebSocket sessions)..."
        
        if [[ "$OS" == "macos" ]]; then
            brew install redis
            brew services start redis
            wait_for_service "redis" "6379"
        elif [[ "$OS" == "linux" ]]; then
            sudo apt-get install -y redis-server
            sudo systemctl start redis
            sudo systemctl enable redis
            wait_for_service "redis" "6379"
        fi
        
        log_success "Redis installed and running"
    else
        log_success "Redis already installed"
        
        # Make sure Redis is running
        if [[ "$OS" == "macos" ]]; then
            if ! service_running "redis"; then
                log_info "Starting Redis..."
                brew services start redis
                wait_for_service "redis" "6379"
            fi
        elif [[ "$OS" == "linux" ]]; then
            if ! service_running "redis"; then
                log_info "Starting Redis..."
                sudo systemctl start redis
                wait_for_service "redis" "6379"
            fi
        fi
    fi
}

# Install Python (for embedding service)
install_python() {
    if ! command_exists python3; then
        log_info "Installing Python 3.11 (for embedding service)..."
        
        if [[ "$OS" == "macos" ]]; then
            brew install python@3.11
            # Add to PATH
            echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc
            export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"
        elif [[ "$OS" == "linux" ]]; then
            sudo apt-get install -y python3.11 python3.11-pip python3.11-venv python3.11-dev
            # Create symlinks if needed
            sudo ln -sf /usr/bin/python3.11 /usr/bin/python3
        fi
        
        log_success "Python installed: $(python3 --version)"
    else
        log_success "Python already installed: $(python3 --version)"
    fi
    
    # Install pip if not available
    if ! command_exists pip3; then
        log_info "Installing pip..."
        if [[ "$OS" == "macos" ]]; then
            python3 -m ensurepip --upgrade
        elif [[ "$OS" == "linux" ]]; then
            sudo apt-get install -y python3-pip
        fi
    fi
}

# Setup PostgreSQL database
setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    DB_NAME="fyp_platform"
    DB_USER="postgres"
    DB_PASSWORD="password"
    
    # Test PostgreSQL connection
    if ! psql -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
        log_error "Cannot connect to PostgreSQL. Make sure it's running and accessible."
        log_info "Try: brew services restart postgresql@15"
        exit 1
    fi
    
    # Check if database exists
    if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_success "Database '$DB_NAME' already exists"
    else
        log_info "Creating database '$DB_NAME'..."
        psql -U postgres -c "CREATE DATABASE $DB_NAME;"
        log_success "Database '$DB_NAME' created"
    fi
    
    # Grant permissions (PostgreSQL user should have all permissions by default)
    psql -U postgres -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO postgres;"
    
    log_success "Database setup completed"
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
    
    # Check if npm is available
    if ! command_exists npm; then
        log_error "npm not found. Please install Node.js first."
        exit 1
    fi
    
    # Backend dependencies
    log_info "Installing backend dependencies (this may take a few minutes)..."
    npm ci --prefer-offline --no-audit
    log_success "Backend dependencies installed"
    
    # Frontend dependencies
    if [ -d "frontend" ]; then
        log_info "Installing frontend dependencies..."
        cd frontend
        npm ci --prefer-offline --no-audit
        cd ..
        log_success "Frontend dependencies installed"
    else
        log_warning "Frontend directory not found, skipping frontend dependencies"
    fi
    
    # Embedding service dependencies
    if [ -d "embedding-service" ]; then
        log_info "Installing embedding service dependencies..."
        cd embedding-service
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        
        # Activate and install dependencies
        source venv/bin/activate
        
        # Upgrade pip first
        pip install --upgrade pip
        
        # Install requirements if file exists
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt
        else
            log_warning "requirements.txt not found in embedding-service"
        fi
        
        deactivate
        cd ..
        log_success "Embedding service dependencies installed"
    else
        log_warning "Embedding service directory not found, skipping embedding service setup"
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Check if TypeORM is configured
    if [ ! -f "src/config/typeorm.config.ts" ]; then
        log_warning "TypeORM config not found, skipping migrations"
        return
    fi
    
    # Run migrations with error handling
    if npm run migration:run; then
        log_success "Database migrations completed"
    else
        log_warning "Migration failed, but continuing setup. You may need to run migrations manually later."
        log_info "To run migrations manually: npm run migration:run"
    fi
}

# Seed database (optional)
seed_database() {
    log_info "Seeding database with sample data..."
    
    # Check if seed script exists
    if ! npm run | grep -q "seed"; then
        log_warning "Seed script not found, skipping database seeding"
        return
    fi
    
    # Run seeding with error handling
    if npm run seed; then
        log_success "Database seeded with sample data"
        echo ""
        echo -e "${YELLOW}Sample user accounts created:${NC}"
        echo "  - Admin: admin@university.edu / password"
        echo "  - Supervisor: supervisor@university.edu / password" 
        echo "  - Student: student@university.edu / password"
    else
        log_warning "Database seeding failed, but continuing setup"
        log_info "You can seed the database later with: npm run seed"
    fi
}

# Install Docker (for Qdrant vector database)
install_docker() {
    if ! command_exists docker; then
        log_info "Installing Docker (for Qdrant vector database)..."
        
        if [[ "$OS" == "macos" ]]; then
            log_info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
            log_warning "After installing Docker Desktop, please restart this script"
            read -p "Press Enter when Docker Desktop is installed and running..."
        elif [[ "$OS" == "linux" ]]; then
            # Install Docker on Linux
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            sudo systemctl start docker
            sudo systemctl enable docker
            rm get-docker.sh
        fi
        
        log_success "Docker installation completed"
    else
        log_success "Docker already installed"
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_warning "Docker is not running. Please start Docker Desktop and try again."
        return 1
    fi
}

# Setup Qdrant vector database
setup_qdrant() {
    log_info "Setting up Qdrant vector database..."
    
    # Check if docker-compose.qdrant.yml exists
    if [ -f "docker-compose.qdrant.yml" ]; then
        log_info "Starting Qdrant with Docker Compose..."
        docker-compose -f docker-compose.qdrant.yml up -d
        
        # Wait for Qdrant to be ready
        wait_for_service "qdrant" "6333"
        log_success "Qdrant vector database is running"
    else
        log_warning "docker-compose.qdrant.yml not found, skipping Qdrant setup"
        log_info "You can set up Qdrant manually later if needed"
    fi
}

# Create comprehensive start script
create_start_script() {
    log_info "Creating comprehensive start script..."
    
    cat > start.sh << 'EOF'
#!/bin/bash

# ProjectHub Development Server Starter
# This script starts all required services for development

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if services are running
check_service() {
    local service=$1
    local port=$2
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓ $service is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}✗ $service is not running on port $port${NC}"
        return 1
    fi
}

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║              Starting ProjectHub Services                 ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
check_service "PostgreSQL" "5432" || {
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    if command -v brew >/dev/null 2>&1; then
        brew services start postgresql@15
    else
        sudo systemctl start postgresql
    fi
    sleep 3
}

check_service "Redis" "6379" || {
    echo -e "${YELLOW}Starting Redis...${NC}"
    if command -v brew >/dev/null 2>&1; then
        brew services start redis
    else
        sudo systemctl start redis
    fi
    sleep 2
}

# Start Qdrant if docker-compose file exists
if [ -f "docker-compose.qdrant.yml" ]; then
    echo -e "${YELLOW}Starting Qdrant vector database...${NC}"
    docker-compose -f docker-compose.qdrant.yml up -d
    sleep 3
fi

echo ""
echo -e "${BLUE}Starting application services...${NC}"

# Start backend
echo -e "${GREEN}🚀 Starting backend server...${NC}"
npm run start:dev &
BACKEND_PID=$!

# Start frontend
if [ -d "frontend" ]; then
    echo -e "${GREEN}🚀 Starting frontend server...${NC}"
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
fi

# Start embedding service if it exists
if [ -d "embedding-service" ] && [ -f "embedding-service/venv/bin/activate" ]; then
    echo -e "${GREEN}🚀 Starting embedding service...${NC}"
    cd embedding-service
    source venv/bin/activate
    python main.py &
    EMBEDDING_PID=$!
    deactivate
    cd ..
fi

# Wait a moment for services to start
sleep 5

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║              🎉 All Services Started! 🎉                  ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📱 Application URLs:${NC}"
echo "   Frontend:    ${GREEN}http://localhost:3000${NC}"
echo "   Backend API: ${GREEN}http://localhost:3001${NC}"
echo "   API Docs:    ${GREEN}http://localhost:3001/api${NC}"
if [ -d "embedding-service" ]; then
    echo "   Embeddings:  ${GREEN}http://localhost:8001${NC}"
fi
echo ""
echo -e "${BLUE}🔧 Development Tools:${NC}"
echo "   Database:    PostgreSQL on port 5432"
echo "   Cache:       Redis on port 6379"
if [ -f "docker-compose.qdrant.yml" ]; then
    echo "   Vector DB:   Qdrant on port 6333"
fi
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   - Check logs in your terminal"
echo "   - Frontend hot-reloads on file changes"
echo "   - Backend restarts automatically on changes"
echo "   - Press Ctrl+C to stop all services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    
    # Kill background processes
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    [ ! -z "$EMBEDDING_PID" ] && kill $EMBEDDING_PID 2>/dev/null
    
    # Stop Docker services
    if [ -f "docker-compose.qdrant.yml" ]; then
        docker-compose -f docker-compose.qdrant.yml down
    fi
    
    echo -e "${GREEN}All services stopped. Goodbye! 👋${NC}"
    exit 0
}

# Wait for Ctrl+C
trap cleanup INT
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
wait
EOF
    
    chmod +x start.sh
    log_success "Enhanced start script created (./start.sh)"
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
    echo "5. Environment Configuration:"
    echo "   - Update .env with your API keys (OpenRouter, HuggingFace, etc.)"
    echo "   - See .env.example for all available options"
    echo "   - Email configuration needed for notifications"
    echo ""
    echo -e "${YELLOW}📋 Quick Start Checklist:${NC}"
    echo "   ✓ PostgreSQL running on port 5432"
    echo "   ✓ Redis running on port 6379"
    echo "   ✓ Qdrant running on port 6333 (if using vector features)"
    echo "   ✓ Environment files configured"
    echo "   ✓ Dependencies installed"
    echo "   ✓ Database migrated and seeded"
    echo ""
    echo -e "${BLUE}🔗 Useful Commands:${NC}"
    echo "   - Start all services: ${GREEN}./start.sh${NC}"
    echo "   - Run tests: ${GREEN}npm test${NC}"
    echo "   - View logs: Check your terminal after starting services"
    echo "   - Reset database: ${GREEN}npm run seed:rollback && npm run seed${NC}"
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
    install_utilities
    install_node
    install_postgresql
    install_redis
    install_python
    install_docker
    
    echo ""
    log_info "System dependencies installed!"
    echo ""
    
    # Setup database
    setup_database
    
    # Setup environment files
    setup_env_files
    
    # Install project dependencies
    install_dependencies
    
    # Setup vector database
    setup_qdrant
    
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
