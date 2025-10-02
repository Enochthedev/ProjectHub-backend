#!/bin/bash

# Quick Render Deployment Script
# This script prepares the repository for Render deployment

set -e

echo "🚀 Preparing for Render Deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if git is clean
check_git_status() {
    if [[ -n $(git status -s) ]]; then
        print_warning "You have uncommitted changes. Commit them before deploying."
        git status -s
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Validate render.yaml
validate_render_config() {
    print_status "Validating render.yaml..."
    
    if [ ! -f "render.yaml" ]; then
        print_error "render.yaml not found!"
        exit 1
    fi
    
    # Check for required services
    if ! grep -q "projecthub-backend" render.yaml; then
        print_error "Backend service not found in render.yaml"
        exit 1
    fi
    
    if ! grep -q "projecthub-frontend" render.yaml; then
        print_error "Frontend service not found in render.yaml"
        exit 1
    fi
    
    print_status "render.yaml is valid"
}

# Check environment examples
check_env_examples() {
    print_status "Checking environment examples..."
    
    if [ ! -f ".env.example" ]; then
        print_warning ".env.example not found"
    fi
    
    if [ ! -f "frontend/.env.example" ]; then
        print_warning "frontend/.env.example not found"
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    npm test -- --run --passWithNoTests || {
        print_error "Backend tests failed"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm test -- --run --passWithNoTests || {
        print_error "Frontend tests failed"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
    cd ..
}

# Build check
build_check() {
    print_status "Checking builds..."
    
    # Backend build
    print_status "Building backend..."
    npm run build || {
        print_error "Backend build failed"
        exit 1
    }
    
    # Frontend build
    print_status "Building frontend..."
    cd frontend
    npm run build || {
        print_error "Frontend build failed"
        exit 1
    }
    cd ..
}

# Create deployment commit
create_deployment_commit() {
    print_status "Creating deployment commit..."
    
    git add .
    git commit -m "chore: prepare for deployment $(date +%Y-%m-%d)" || {
        print_warning "No changes to commit"
    }
}

# Push to repository
push_to_repo() {
    print_status "Pushing to repository..."
    
    BRANCH=$(git branch --show-current)
    print_status "Current branch: $BRANCH"
    
    git push origin $BRANCH || {
        print_error "Failed to push to repository"
        exit 1
    }
}

# Display next steps
show_next_steps() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                  Deployment Ready!                         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Next steps to deploy on Render:"
    echo ""
    echo "1. Go to https://dashboard.render.com/"
    echo "2. Click 'New' → 'Blueprint'"
    echo "3. Connect your GitHub repository"
    echo "4. Render will detect render.yaml automatically"
    echo "5. Add the following secret environment variables:"
    echo ""
    echo "   Backend Service:"
    echo "   - HUGGING_FACE_API_KEY"
    echo "   - OPENAI_API_KEY (optional)"
    echo "   - EMAIL_USER"
    echo "   - EMAIL_PASSWORD"
    echo ""
    echo "6. Click 'Apply' to deploy"
    echo "7. Wait for deployment (5-10 minutes)"
    echo "8. Run migrations: render shell projecthub-backend"
    echo "   Then: npm run migration:run"
    echo ""
    echo "9. Verify deployment:"
    echo "   - Backend: https://projecthub-backend.onrender.com/health"
    echo "   - Frontend: https://projecthub-frontend.onrender.com"
    echo ""
    echo "📚 Full deployment guide: DEPLOYMENT.md"
    echo "✅ Pre-deployment checklist: PRE_DEPLOYMENT_CHECKLIST.md"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   Render Deployment Preparation        ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # Parse arguments
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
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests    Skip running tests"
                echo "  --skip-build    Skip build check"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run checks
    check_git_status
    validate_render_config
    check_env_examples
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_check
    else
        print_warning "Skipping build check"
    fi
    
    # Prepare for deployment
    create_deployment_commit
    push_to_repo
    
    # Show next steps
    show_next_steps
}

# Run main
main "$@"
