#!/bin/bash

# Wipe Organization Data Script Runner
# Usage: ./scripts/run-wipe.sh [organization-id]

# Set the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Check if organization ID is provided as argument
if [ -n "$1" ]; then
    echo "🧹 Running organization data wipe for ID: $1"
    npx tsx scripts/wipe-organization-data.ts "$1"
else
    echo "🧹 Running organization data wipe (will prompt for ID)"
    npx tsx scripts/wipe-organization-data.ts
fi
