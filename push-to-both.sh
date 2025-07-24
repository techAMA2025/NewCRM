#!/bin/bash

# Script to push to both repositories simultaneously
echo "🚀 Pushing to both repositories..."

# Push to origin (first repository)
echo "📤 Pushing to origin (Ankita030694/NewCrm)..."
git push origin main

# Push to backup (second repository)
echo "📤 Pushing to backup (techAMA2025/NewCRM)..."
git push backup main

echo "✅ Successfully pushed to both repositories!"
