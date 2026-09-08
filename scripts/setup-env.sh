#!/bin/bash
set -e

# PawCall Environment Setup Script
# Usage: ./scripts/setup-env.sh [dev|staging|local]

ENVIRONMENT=${1:-local}

echo "🐾 PawCall Environment Setup"
echo "=============================="
echo ""

case $ENVIRONMENT in
  dev)
    echo "Setting up DEV environment..."
    cp .env.dev .env
    echo "✅ .env configured for DEV"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env and set actual Neon connection strings"
    echo "2. Run: npm run db:migrate"
    echo "3. Run: npm run dev"
    ;;
  
  staging)
    echo "Setting up STAGING environment..."
    cp .env.staging .env
    echo "✅ .env configured for STAGING"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env and set actual Neon connection strings"
    echo "2. Run: npm run db:migrate"
    echo "3. Run: npm run dev"
    ;;
  
  local)
    echo "Setting up LOCAL development environment..."
    if [ ! -f .env ]; then
      cp .env.example .env
      echo "✅ .env created from .env.example"
    else
      echo "ℹ️  .env already exists, skipping copy"
    fi
    echo ""
    echo "Next steps:"
    echo "1. Edit .env and set:"
    echo "   - DATABASE_URL (local Postgres or Neon)"
    echo "   - PLATFORM_DATABASE_URL"
    echo "   - AUTH_SECRET (run: openssl rand -hex 64)"
    echo "2. Create databases:"
    echo "   - createdb pawscall"
    echo "   - createdb pawscall_platform"
    echo "   - createdb pawscall_demo"
    echo "3. Run: npm run db:migrate"
    echo "4. Run: npm run db:seed"
    echo "5. Run: npm run dev"
    ;;
  
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo ""
    echo "Usage: ./scripts/setup-env.sh [dev|staging|local]"
    echo ""
    echo "  dev       - Set up for dev environment (Neon + Vercel)"
    echo "  staging   - Set up for staging environment (Neon + Vercel)"
    echo "  local     - Set up for local development"
    exit 1
    ;;
esac

echo ""
echo "📖 For detailed setup instructions, see ENVIRONMENTS.md"
