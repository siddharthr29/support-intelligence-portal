#!/bin/bash

echo "=========================================="
echo "Testing Backend Firebase Configuration"
echo "=========================================="
echo ""

# Test 1: Health check
echo "1. Testing backend health..."
HEALTH=$(curl -s https://support-intelligence-portal.onrender.com/health)
echo "Response: $HEALTH"
echo ""

# Test 2: Check if backend is rejecting auth
echo "2. Testing API endpoint without token (should get 401)..."
NO_TOKEN=$(curl -s https://support-intelligence-portal.onrender.com/api/app-data)
echo "Response: $NO_TOKEN"
echo ""

# Test 3: Check with invalid token (should get AUTH_TOKEN_INVALID)
echo "3. Testing API endpoint with invalid token..."
INVALID_TOKEN=$(curl -s -H "Authorization: Bearer invalid-token-12345" https://support-intelligence-portal.onrender.com/api/app-data)
echo "Response: $INVALID_TOKEN"
echo ""

echo "=========================================="
echo "Analysis:"
echo "=========================================="
echo ""
echo "If you see 'AUTH_TOKEN_INVALID' in test 3, it means:"
echo "  - Firebase Admin SDK is initialized"
echo "  - Token verification is working"
echo "  - The issue is with the actual token from frontend"
echo ""
echo "If you see 'AUTH_SERVICE_UNAVAILABLE' or 500 error:"
echo "  - Firebase Admin SDK is NOT configured properly"
echo "  - Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
echo ""
echo "Next step: Share browser console screenshot after login attempt"
