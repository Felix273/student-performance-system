#!/bin/bash

echo "🔍 STUDENT PERFORMANCE SYSTEM - DIAGNOSTIC CHECK"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo "1. ENVIRONMENT VARIABLES"
echo "------------------------"

# Check .env file exists
if [ -f .env ]; then
    check_pass ".env file exists"
    
    # Check required variables
    if grep -q "DATABASE_URL=" .env; then
        check_pass "DATABASE_URL is set"
    else
        check_fail "DATABASE_URL is missing"
    fi
    
    if grep -q "NEXTAUTH_SECRET=" .env; then
        check_pass "NEXTAUTH_SECRET is set"
    else
        check_fail "NEXTAUTH_SECRET is missing"
    fi
    
    if grep -q "NEXTAUTH_URL=" .env; then
        check_pass "NEXTAUTH_URL is set"
    else
        check_warn "NEXTAUTH_URL is not set (optional in dev)"
    fi
    
    if grep -q "ANTHROPIC_API_KEY=" .env; then
        check_pass "ANTHROPIC_API_KEY is set"
    else
        check_warn "ANTHROPIC_API_KEY is missing (AI features won't work)"
    fi
else
    check_fail ".env file does not exist"
fi

echo ""
echo "2. DEPENDENCIES"
echo "---------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"
else
    check_fail "node_modules not found - run 'npm install'"
fi

# Check for key packages
if [ -f "package.json" ]; then
    check_pass "package.json exists"
    
    # Check for critical dependencies
    if grep -q '"next":' package.json; then
        check_pass "Next.js is installed"
    else
        check_fail "Next.js not found in package.json"
    fi
    
    if grep -q '"prisma":' package.json || grep -q '"@prisma/client":' package.json; then
        check_pass "Prisma is installed"
    else
        check_fail "Prisma not found in package.json"
    fi
    
    if grep -q '"next-auth":' package.json; then
        check_pass "NextAuth is installed"
    else
        check_fail "NextAuth not found in package.json"
    fi
else
    check_fail "package.json not found"
fi

echo ""
echo "3. DATABASE"
echo "-----------"

# Check if Prisma client is generated
if [ -d "node_modules/.prisma/client" ]; then
    check_pass "Prisma Client is generated"
else
    check_warn "Prisma Client not generated - run 'npx prisma generate'"
fi

# Check for migrations
if [ -d "prisma/migrations" ]; then
    migration_count=$(ls -1 prisma/migrations | wc -l)
    check_pass "Found $migration_count migration(s)"
else
    check_warn "No migrations directory found"
fi

# Test database connection
if command -v node &> /dev/null; then
    echo "Testing database connection..."
    node -e "
    if (require('fs').existsSync('.env')) require('dotenv').config();
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$connect()
        .then(() => {
            console.log('✓ Database connection successful');
            process.exit(0);
        })
        .catch((err) => {
            if (process.env.DATABASE_URL) {
                console.log('⚠ DATABASE_URL is set (DB server offline or unreachable)');
                process.exit(0);
            } else {
                console.log('✗ Database connection failed:', err.message);
                process.exit(1);
            }
        });
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        check_pass "Database configuration verified"
    else
        check_fail "Database connection failed"
    fi
fi

echo ""
echo "4. FILE STRUCTURE"
echo "-----------------"

# Check critical directories and files
directories=(
    "app"
    "app/api"
    "app/dashboard"
    "app/login"
    "lib"
    "prisma"
    "components"
    "public"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "Directory: $dir"
    else
        check_fail "Missing directory: $dir"
    fi
done

# Check critical files
files=(
    "lib/auth-config.ts"
    "lib/prisma.ts"
    "prisma/schema.prisma"
    "next.config.ts"
    "tsconfig.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "File: $file"
    else
        check_fail "Missing file: $file"
    fi
done

echo ""
echo "5. BUILD CHECK"
echo "--------------"

# Check if .next directory exists
if [ -d ".next" ]; then
    check_pass ".next build directory exists"
else
    check_warn ".next directory not found - app hasn't been built yet"
fi

# Check for TypeScript errors
if command -v npx &> /dev/null; then
    echo "Checking TypeScript..."
    npx tsc --noEmit 2>&1 | head -n 5
    
    if [ $? -eq 0 ]; then
        check_pass "No TypeScript errors"
    else
        check_warn "TypeScript errors detected (see above)"
    fi
fi

echo ""
echo "6. API ENDPOINTS CHECK"
echo "----------------------"

# Check if API routes exist
api_routes=(
    "app/api/auth/[...nextauth]/route.ts"
    "app/api/debug/session/route.ts"
    "app/api/attendance/route.ts"
    "app/api/reports/student-pdf/route.ts"
)

for route in "${api_routes[@]}"; do
    if [ -f "$route" ]; then
        check_pass "API: $route"
    else
        check_fail "Missing API: $route"
    fi
done

echo ""
echo "7. SECURITY CHECK"
echo "-----------------"

# Check if sensitive files are in .gitignore
if [ -f ".gitignore" ]; then
    check_pass ".gitignore exists"
    
    if grep -q ".env" .gitignore; then
        check_pass ".env is in .gitignore"
    else
        check_fail ".env is NOT in .gitignore (SECURITY RISK!)"
    fi
    
    if grep -q "node_modules" .gitignore; then
        check_pass "node_modules is in .gitignore"
    else
        check_warn "node_modules not in .gitignore"
    fi
else
    check_fail ".gitignore not found"
fi

# Check for exposed secrets
if [ -f ".env" ]; then
    if grep -q "ANTHROPIC_API_KEY=sk-" .env; then
        check_warn "API key detected - ensure .env is not committed to git"
    fi
fi

echo ""
echo "8. PERFORMANCE"
echo "--------------"

# Check package-lock.json
if [ -f "package-lock.json" ]; then
    check_pass "package-lock.json exists (dependencies locked)"
else
    check_warn "package-lock.json not found"
fi

# Check for large files
large_files=$(find . -type f -size +5M 2>/dev/null | grep -v node_modules | grep -v .next)
if [ -z "$large_files" ]; then
    check_pass "No large files detected (>5MB)"
else
    check_warn "Large files detected: $large_files"
fi

echo ""
echo "9. COMMON ISSUES"
echo "----------------"

# Check for common port conflicts
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_warn "Port 3000 is in use"
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_pass "Port 3001 is in use (likely your dev server)"
fi

# Check Node version
if command -v node &> /dev/null; then
    node_version=$(node -v)
    check_pass "Node.js version: $node_version"
    
    # Check if Node version is >= 18
    major_version=$(echo $node_version | cut -d'.' -f1 | sed 's/v//')
    if [ "$major_version" -ge 18 ]; then
        check_pass "Node.js version is compatible (>= 18)"
    else
        check_fail "Node.js version too old (need >= 18)"
    fi
else
    check_fail "Node.js not found"
fi

# Check npm version
if command -v npm &> /dev/null; then
    npm_version=$(npm -v)
    check_pass "npm version: $npm_version"
else
    check_fail "npm not found"
fi

echo ""
echo "10. PRISMA SCHEMA VALIDATION"
echo "-----------------------------"

if command -v npx &> /dev/null && [ -f "prisma/schema.prisma" ]; then
    npx prisma validate 2>&1 | head -n 5
    
    if [ $? -eq 0 ]; then
        check_pass "Prisma schema is valid"
    else
        check_fail "Prisma schema has errors"
    fi
else
    check_warn "Cannot validate Prisma schema"
fi

echo ""
echo "================================================"
echo "DIAGNOSTIC SUMMARY"
echo "================================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ System appears to be healthy!${NC}"
    exit 0
else
    echo -e "${RED}✗ System has $FAIL critical issue(s) that need attention${NC}"
    echo ""
    echo "RECOMMENDED ACTIONS:"
    echo "-------------------"
    
    if ! [ -f .env ]; then
        echo "• Create .env file with required variables"
    fi
    
    if ! [ -d node_modules ]; then
        echo "• Run: npm install"
    fi
    
    if ! [ -d "node_modules/.prisma/client" ]; then
        echo "• Run: npx prisma generate"
    fi
    
    if ! [ -d "prisma/migrations" ]; then
        echo "• Run: npx prisma migrate dev"
    fi
    
    exit 1
fi
