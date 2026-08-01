#!/bin/sh
set -e

echo "🧠 Mind Bridge Server - Starting deployment..."

# Run database migrations (safe for production: applies pending migrations, does not generate drift)
echo "📦 Running database migrations..."
npx prisma migrate deploy

echo "🚀 Starting server..."
exec "$@"
