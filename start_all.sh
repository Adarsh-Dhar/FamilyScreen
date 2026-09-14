#!/bin/bash

# Kill any existing processes on the ports we need
echo "Cleaning up existing processes..."
lsof -ti:3000,3001,8080 | xargs kill -9 2>/dev/null || true
sleep 1

# Start all services in the background
echo "Starting API Server on port 8080..."
pnpm --filter @workspace/api-server run dev &
API_PID=$!

echo "Starting Family Screen on port 3000..."
pnpm --filter @workspace/family-screen run dev &
FAMILY_PID=$!

echo "Starting Mockup Sandbox on port 3001..."
pnpm --filter @workspace/mockup-sandbox run dev &
MOCKUP_PID=$!

# Function to handle cleanup on exit
cleanup() {
    echo "Stopping all services..."
    kill $API_PID $FAMILY_PID $MOCKUP_PID 2>/dev/null
    exit
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

echo "All services started. Press Ctrl+C to stop all services."
echo "API Server: http://localhost:8080"
echo "Family Screen: http://localhost:3000"
echo "Mockup Sandbox: http://localhost:3001"

# Wait for all background processes
wait