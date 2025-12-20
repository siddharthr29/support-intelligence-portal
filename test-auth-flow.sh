#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Complete Auth Flow${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Backend Health Check
echo -e "${YELLOW}[TEST 1] Backend Health Check${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    exit 1
fi
echo ""

# Test 2: Test unauthenticated request (should fail with 401)
echo -e "${YELLOW}[TEST 2] Unauthenticated Request (should return 401)${NC}"
UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/app-data)
HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n1)
BODY=$(echo "$UNAUTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Correctly returns 401 for unauthenticated request${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Check if frontend is accessible
echo -e "${YELLOW}[TEST 3] Frontend Accessibility${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible at http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Frontend returned status code: $FRONTEND_RESPONSE${NC}"
fi
echo ""

# Test 4: Check environment variables
echo -e "${YELLOW}[TEST 4] Environment Configuration${NC}"
echo "Backend URL: http://localhost:3000"
echo "Frontend URL: http://localhost:3000"
echo ""

# Test 5: Check Firebase configuration
echo -e "${YELLOW}[TEST 5] Firebase Configuration${NC}"
if [ -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✓ Frontend .env.local exists${NC}"
    grep "NEXT_PUBLIC_FIREBASE" frontend/.env.local | sed 's/=.*/=***/' || echo "No Firebase config found"
else
    echo -e "${RED}✗ Frontend .env.local not found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Backend Status:${NC} Running on http://localhost:3000"
echo -e "${GREEN}Frontend Status:${NC} Running on http://localhost:3000"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open browser at: http://localhost:3000/login"
echo "2. Login with your credentials"
echo "3. Check browser console for:"
echo "   - '[AuthProvider] Auth state changed: logged in'"
echo "   - '[axios-client] Request with Authorization header'"
echo "   - '[AppDataStore] Data loaded'"
echo "4. Check browser Network tab for:"
echo "   - Authorization: Bearer <token> header in requests"
echo "   - Successful 200 responses from /api/app-data"
echo ""
echo -e "${YELLOW}To monitor backend logs:${NC}"
echo "   cd backend && npm run dev"
echo ""
echo -e "${YELLOW}To monitor frontend logs:${NC}"
echo "   Check browser console (F12)"
echo ""
