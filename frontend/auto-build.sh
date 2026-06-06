#!/bin/bash

# Auto-build script for SPanel frontend
# This script watches the src directory and rebuilds on changes

echo "🚀 Starting SPanel frontend auto-build..."
echo "📁 Watching: src/"
echo "📦 Output: dist/"
echo ""
echo "Press Ctrl+C to stop"
echo "=================================="

# Build once on start
echo "📦 Initial build..."
bun run build
chown -R www-data:www-data dist
chmod -R 755 dist
echo "✅ Initial build complete!"
echo ""

# Watch and rebuild
while true; do
    # Use inotifywait to watch for changes (more efficient than nodemon for this use case)
    if command -v inotifywait &> /dev/null; then
        # Watch for changes in .vue, .js, .ts files
        inotifywait -r -e modify,create,delete,move \
            --include '\.(vue|js|ts)$' \
            src/ 2>/dev/null

        echo ""
        echo "📝 Changes detected, rebuilding..."
        bun run build
        chown -R www-data:www-data dist
        chmod -R 755 dist
        echo "✅ Build complete! $(date '+%H:%M:%S')"
        echo ""
    else
        # Fallback: use sleep loop
        echo "⚠️  inotifywait not found, using polling mode (less efficient)"
        echo "💡 Install inotify-tools for better performance: apt install inotify-tools"
        echo ""

        LAST_BUILD=0
        while true; do
            # Check if any source files are newer than last build
            NEWER_FILES=$(find src/ -type f \( -name "*.vue" -o -name "*.js" -o -name "*.ts" \) -newer /tmp/.spanel-last-build 2>/dev/null | head -1)

            if [ -n "$NEWER_FILES" ]; then
                echo "📝 Changes detected, rebuilding..."
                bun run build
                chown -R www-data:www-data dist
                chmod -R 755 dist
                touch /tmp/.spanel-last-build
                echo "✅ Build complete! $(date '+%H:%M:%S')"
                echo ""
            fi

            sleep 2
        done
    fi
done
