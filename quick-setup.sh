#!/bin/bash

# ProjectHub Quick Setup - One Command Installation
# Usage: curl -sSL https://raw.githubusercontent.com/your-repo/quick-setup.sh | bash
# Or: ./quick-setup.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 ProjectHub Quick Setup${NC}"
echo "This will set up everything you need to run ProjectHub locally"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "setup.sh" ]; then
    echo -e "${YELLOW}Cloning ProjectHub repository...${NC}"
    
    # Check if git is installed
    if ! command -v git >/dev/null 2>&1; then
        echo "Git is required but not installed. Please install Git first."
        exit 1
    fi
    
    # Clone the repository (replace with actual repo URL)
    git clone https://github.com/your-username/ProjectHub-backend.git
    cd ProjectHub-backend
fi

# Make setup script executable
chmod +x setup.sh

# Run the main setup script
echo -e "${GREEN}Running main setup script...${NC}"
./setup.sh

echo ""
echo -e "${GREEN}🎉 Quick setup completed!${NC}"
echo -e "${BLUE}Run ${GREEN}./start.sh${BLUE} to start all services${NC}"