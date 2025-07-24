#!/bin/bash

# Script to commit and push to both repositories simultaneously

# Check if commit message is provided
if [ -z "$1" ]; then
    echo "❌ Please provide a commit message"
    echo "Usage: ./commit-and-push-both.sh \"Your commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🚀 Committing and pushing to both repositories..."

# Add all changes
echo "📁 Adding all changes..."
git add .

# Commit with the provided message
echo "💾 Committing with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# Push to origin (first repository)
echo "📤 Pushing to origin (Ankita030694/NewCrm)..."
git push origin main

# Push to backup (second repository)
echo "📤 Pushing to backup (techAMA2025/NewCRM)..."
git push backup main

echo "✅ Successfully committed and pushed to both repositories!"
