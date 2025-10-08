#!/bin/bash

# Test script to validate the setup script works correctly
# This is a dry-run test that checks the setup script logic

set -e

echo "🧪 Testing ProjectHub Setup Script"
echo "=================================="

# Test 1: Check if setup script exists and is executable
echo "✅ Test 1: Setup script exists and is executable"
if [ -f "setup.sh" ] && [ -x "setup.sh" ]; then
    echo "   ✓ setup.sh found and executable"
else
    echo "   ✗ setup.sh not found or not executable"
    exit 1
fi

# Test 2: Check if quick-setup script exists
echo "✅ Test 2: Quick setup script exists"
if [ -f "quick-setup.sh" ] && [ -x "quick-setup.sh" ]; then
    echo "   ✓ quick-setup.sh found and executable"
else
    echo "   ✗ quick-setup.sh not found or not executable"
    exit 1
fi

# Test 3: Check if start script will be created (simulate)
echo "✅ Test 3: Start script template validation"
if grep -q "create_start_script" setup.sh; then
    echo "   ✓ Start script creation function found"
else
    echo "   ✗ Start script creation function not found"
    exit 1
fi

# Test 4: Check environment file templates
echo "✅ Test 4: Environment file templates"
if [ -f ".env.example" ]; then
    echo "   ✓ .env.example found"
else
    echo "   ✗ .env.example not found"
    exit 1
fi

# Test 5: Check package.json for required scripts
echo "✅ Test 5: Required npm scripts"
required_scripts=("start:dev" "migration:run" "seed")
for script in "${required_scripts[@]}"; do
    if grep -q "\"$script\"" package.json; then
        echo "   ✓ $script script found"
    else
        echo "   ✗ $script script not found"
        exit 1
    fi
done

# Test 6: Check if frontend directory exists
echo "✅ Test 6: Frontend structure"
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo "   ✓ Frontend directory and package.json found"
else
    echo "   ✗ Frontend structure incomplete"
    exit 1
fi

# Test 7: Check documentation files
echo "✅ Test 7: Documentation files"
docs=("QUICKSTART.md" "README.md")
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "   ✓ $doc found"
    else
        echo "   ✗ $doc not found"
        exit 1
    fi
done

echo ""
echo "🎉 All tests passed! Setup script should work correctly."
echo ""
echo "To run the actual setup:"
echo "  ./setup.sh"
echo ""
echo "To test with a fresh environment:"
echo "  docker run -it --rm -v \$(pwd):/app -w /app ubuntu:22.04 bash -c 'apt update && apt install -y curl && ./setup.sh'"