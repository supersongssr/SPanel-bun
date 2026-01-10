#!/bin/sh
set -e

echo "🔧 Setting up SPanel Backend..."

# Change to backend directory if we're in project root
if [ -f "backend/package.json" ]; then
    cd backend
    echo "📁 Changed to backend directory"
fi

# Try to generate Prisma Client (optional, may fail in some environments)
echo "📦 Attempting to generate Prisma Client..."
if bun run prisma:generate 2>/dev/null; then
    echo "✅ Prisma Client generated successfully"
else
    echo "⚠️  Prisma Client generation failed - API will run but database features may not work"
    echo "   This is okay if you're not using database features yet"
fi

echo "🚀 Starting SPanel Backend..."
# Don't use 'set -e' for the exec command, so the server can start even if Prisma failed
exec "$@" || true
