/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

console.log('🔍 STUDENT PERFORMANCE SYSTEM - QUICK CHECK\n');

let pass = 0, fail = 0, warn = 0;

const check = (condition, message, type = 'pass') => {
  if (type === 'pass' && condition) {
    console.log('✓', message);
    pass++;
  } else if (type === 'fail' && !condition) {
    console.log('✗', message);
    fail++;
  } else if (type === 'warn') {
    console.log('⚠', message);
    warn++;
  }
};

// 1. Database connection
try {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.$connect().then(() => {
    console.log('✓ Database connected');
    pass++;
  }).catch(() => {
    console.log('✗ Database connection failed');
    fail++;
  });
} catch (e) {
  console.log('✗ Prisma client error:', e.message);
  fail++;
}

// 2. Required files
const requiredFiles = [
  '.env',
  'prisma/schema.prisma',
  'lib/auth-config.ts',
  'lib/prisma.ts',
  'package.json'
];

requiredFiles.forEach(file => {
  check(fs.existsSync(file), `File exists: ${file}`, fs.existsSync(file) ? 'pass' : 'fail');
});

// 3. Environment variables
if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf8');
  check(env.includes('DATABASE_URL'), 'DATABASE_URL set', env.includes('DATABASE_URL') ? 'pass' : 'fail');
  check(env.includes('NEXTAUTH_SECRET'), 'NEXTAUTH_SECRET set', env.includes('NEXTAUTH_SECRET') ? 'pass' : 'fail');
  check(env.includes('ANTHROPIC_API_KEY'), 'ANTHROPIC_API_KEY set (optional)', env.includes('ANTHROPIC_API_KEY') ? 'pass' : 'warn');
}

setTimeout(() => {
  console.log(`\n✓ ${pass} passed | ⚠ ${warn} warnings | ✗ ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}, 1000);
