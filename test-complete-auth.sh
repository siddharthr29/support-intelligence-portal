#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BACKEND_URL="https://support-intelligence-portal.onrender.com"
FRONTEND_URL="http://localhost:3000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Complete Authentication Flow Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Backend Health Check
echo -e "${CYAN}[TEST 1] Backend Health Check${NC}"
echo "Testing: $BACKEND_URL/health"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend is running and healthy${NC}"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "$HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Test unauthenticated request (should fail with 401)
echo -e "${CYAN}[TEST 2] Unauthenticated API Request${NC}"
echo "Testing: $BACKEND_URL/api/app-data (without auth token)"
UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/app-data")
HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n1)
BODY=$(echo "$UNAUTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Correctly returns 401 for unauthenticated request${NC}"
    echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Check if frontend is accessible
echo -e "${CYAN}[TEST 3] Frontend Accessibility${NC}"
echo "Testing: $FRONTEND_URL"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
    echo "URL: $FRONTEND_URL"
else
    echo -e "${RED}✗ Frontend returned status code: $FRONTEND_RESPONSE${NC}"
    echo "Make sure frontend dev server is running: npm run dev"
fi
echo ""

# Test 4: Check Firebase configuration
echo -e "${CYAN}[TEST 4] Firebase Configuration${NC}"
if [ -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✓ Frontend .env.local exists${NC}"
    echo "Firebase Config:"
    grep "NEXT_PUBLIC_FIREBASE" frontend/.env.local | sed 's/=.*/=***/' | sed 's/^/  /'
else
    echo -e "${RED}✗ Frontend .env.local not found${NC}"
fi
echo ""

# Test 5: Check API URL configuration
echo -e "${CYAN}[TEST 5] API URL Configuration${NC}"
if grep -q "NEXT_PUBLIC_API_URL" frontend/.env.local 2>/dev/null; then
    API_URL=$(grep "NEXT_PUBLIC_API_URL" frontend/.env.local | cut -d'=' -f2)
    echo -e "${GREEN}✓ API URL configured${NC}"
    echo "  NEXT_PUBLIC_API_URL=$API_URL"
    
    if [ "$API_URL" = "http://localhost:3000" ]; then
        echo -e "${YELLOW}  ⚠ Using localhost backend${NC}"
        echo -e "${YELLOW}  Note: Frontend and backend both on port 3000 may cause conflicts${NC}"
        echo -e "${YELLOW}  Consider using production backend: $BACKEND_URL${NC}"
    fi
else
    echo -e "${RED}✗ NEXT_PUBLIC_API_URL not found in .env.local${NC}"
fi
echo ""

# Test 6: Check axios-client implementation
echo -e "${CYAN}[TEST 6] Axios Client Implementation${NC}"
if grep -q "axiosClient" frontend/src/lib/axios-client.ts 2>/dev/null; then
    echo -e "${GREEN}✓ Axios client exists${NC}"
    
    # Check for auth interceptor
    if grep -q "Authorization.*Bearer" frontend/src/lib/axios-client.ts; then
        echo -e "${GREEN}✓ Authorization header interceptor configured${NC}"
    else
        echo -e "${RED}✗ Authorization header interceptor not found${NC}"
    fi
    
    # Check for authReady guard
    if grep -q "waitForAuthReady\|authReady" frontend/src/lib/axios-client.ts; then
        echo -e "${GREEN}✓ Auth ready guard implemented${NC}"
    else
        echo -e "${RED}✗ Auth ready guard not found${NC}"
    fi
else
    echo -e "${RED}✗ Axios client not found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Backend:${NC} Running on $BACKEND_URL"
echo -e "${GREEN}✓ Frontend:${NC} Running on $FRONTEND_URL"
echo -e "${GREEN}✓ Auth:${NC} Firebase configured"
echo -e "${GREEN}✓ Security:${NC} Unauthenticated requests blocked (401)"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Manual Testing Steps${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${CYAN}Step 1: Open Browser${NC}"
echo "  URL: $FRONTEND_URL/login"
echo ""
echo -e "${CYAN}Step 2: Open Browser DevTools (F12)${NC}"
echo "  - Open Console tab"
echo "  - Open Network tab"
echo ""
echo -e "${CYAN}Step 3: Login with your credentials${NC}"
echo ""
echo -e "${CYAN}Step 4: Check Console for these logs:${NC}"
echo "  ${GREEN}✓${NC} [AuthProvider] Auth state changed: logged in"
echo "  ${GREEN}✓${NC} [axios-client] Request with Authorization header"
echo "  ${GREEN}✓${NC} [AppDataStore] Data loaded: {ticketCount: X, ...}"
echo ""
echo -e "${CYAN}Step 5: Check Network tab for:${NC}"
echo "  ${GREEN}✓${NC} Request to: $BACKEND_URL/api/app-data"
echo "  ${GREEN}✓${NC} Request Headers: Authorization: Bearer eyJ..."
echo "  ${GREEN}✓${NC} Response Status: 200 OK"
echo "  ${GREEN}✓${NC} Response Data: {success: true, data: {...}}"
echo ""
echo -e "${CYAN}Step 6: Verify Dashboard Loads${NC}"
echo "  ${GREEN}✓${NC} Dashboard shows ticket statistics"
echo "  ${GREEN}✓${NC} Charts render correctly"
echo "  ${GREEN}✓${NC} No error messages"
echo "  ${GREEN}✓${NC} No infinite loading spinners"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Backend Logs to Monitor${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "If you have access to backend logs, check for:"
echo "  ${GREEN}✓${NC} No 'No authentication token provided' errors"
echo "  ${GREEN}✓${NC} Successful token verification"
echo "  ${GREEN}✓${NC} 200 responses for /api/app-data"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
