#!/bin/bash

# ProjectHub Deployment Script
# This script handles the complete deployment process

set -e

echo "🚀 Starting ProjectHub Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for required environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "REDIS_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_status "All required environment variables are set"
}

# Run tests
run_tests() {
    print_status "Running backend tests..."
    npm test -- --run || {
        print_error "Backend tests failed"
        exit 1
    }
    
    print_status "Running frontend tests..."
    cd frontend
    npm test -- --run || {
        print_error "Frontend tests failed"
        exit 1
    }
    cd ..
    
    print_status "All tests passed"
}

# Build backend
build_backend() {
    print_status "Building backend..."
    npm run build || {
        print_error "Backend build failed"
        exit 1
    }
    print_status "Backend build completed"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    cd frontend
    npm run build || {
        print_error "Frontend build failed"
        exit 1
    }
    cd ..
    print_status "Frontend build completed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    npm run migration:run || {
        print_error "Database migrations failed"
        exit 1
    }
    print_status "Database migrations completed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait for services to start
    sleep 5
    
    # Check backend health
    if curl -f http://localhost:${PORT:-3001}/health > /dev/null 2>&1; then
        print_status "Backend health check passed"
    else
        print_warning "Backend health check failed (this is normal if not running locally)"
    fi
}

# Main deployment flow
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   ProjectHub Deployment Script         ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Usage: $0 [--skip-tests] [--skip-build]"
                exit 1
                ;;
        esac
    done
    
    # Check environment
    check_env_vars
    
    # Run tests unless skipped
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    # Build unless skipped
    if [ "$SKIP_BUILD" = false ]; then
        build_backend
        build_frontend
    else
        print_warning "Skipping build"
    fi
    
    # Run migrations
    run_migrations
    
    # Health check
    health_check
    
    echo ""
    print_status "Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Verify the deployment at your production URL"
    echo "  2. Monitor logs for any errors"
    echo "  3. Run smoke tests on production"
    echo ""
}

# Run main function
main "$@"
