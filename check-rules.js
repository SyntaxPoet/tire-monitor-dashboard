#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Load rules configuration
const rules = JSON.parse(fs.readFileSync('.x-rules.json', 'utf8'));

function displayHeader() {
  console.log('🚨 TIRE MONITOR - DEBUGGING RULES CHECK');
  console.log('=====================================');
  console.log('');
}

function checkEnvironmentVariables() {
  console.log('🔍 CHECKING: Environment Variables');
  console.log('----------------------------------');
  
  try {
    const envExists = fs.existsSync('.env');
    console.log(`📁 .env file exists: ${envExists ? '✅' : '❌'}`);
    
    if (envExists) {
      const envContent = fs.readFileSync('.env', 'utf8');
      console.log('📝 .env content:', envContent.trim());
    }
    
    const dbUrl = process.env.DATABASE_URL;
    console.log(`🔗 DATABASE_URL set: ${dbUrl ? '✅' : '❌'}`);
    if (dbUrl) console.log(`   Value: ${dbUrl}`);
    
    const dbExists = fs.existsSync('dev.db');
    console.log(`🗄️ Database file exists: ${dbExists ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log('❌ Error checking environment:', error.message);
  }
  console.log('');
}

function checkBuildStatus() {
  console.log('🔍 CHECKING: Build Status');
  console.log('-------------------------');
  
  try {
    // Check for common build issues
    const dbFile = fs.readFileSync('src/lib/db.ts', 'utf8');
    
    // Check for mixed module imports
    const hasRequire = dbFile.includes('require(');
    const hasImport = dbFile.includes('import ');
    const hasExport = dbFile.includes('export ');
    
    if (hasRequire && (hasImport || hasExport)) {
      console.log('❌ Mixed CommonJS and ES modules detected in db.ts');
      console.log('   Fix: Use only ES modules (import/export) or only CommonJS (require/module.exports)');
    } else {
      console.log('✅ Module system consistency check passed');
    }
    
  } catch (error) {
    console.log('❌ Error checking build status:', error.message);
  }
  console.log('');
}

function testApiEndpoints() {
  console.log('🔍 CHECKING: API Endpoints');
  console.log('--------------------------');
  
  try {
    // This would need to be run when server is running
    console.log('⚠️ API test requires running server');
    console.log('   Run: curl http://localhost:3000/api/vehicles');
    console.log('   Expected: JSON response or specific error');
  } catch (error) {
    console.log('❌ Error testing APIs:', error.message);
  }
  console.log('');
}

function displayRules() {
  console.log('📋 CRITICAL DEBUGGING RULES');
  console.log('===========================');
  
  rules.rules
    .filter(rule => rule.priority === 'CRITICAL')
    .forEach((rule, index) => {
      console.log(`${index + 1}. ${rule.title}`);
      console.log(`   ${rule.description}`);
      if (rule.commands) {
        console.log(`   Commands: ${rule.commands.join(', ')}`);
      }
      console.log('');
    });
}

function runChecks(command = '/x') {
  displayHeader();
  
  if (command === '/x' || command === '/x all') {
    checkEnvironmentVariables();
    checkBuildStatus();
    testApiEndpoints();
    displayRules();
  } else if (command === '/x env') {
    checkEnvironmentVariables();
  } else if (command === '/x build') {
    checkBuildStatus();
  } else if (command === '/x api') {
    testApiEndpoints();
  } else if (command === '/x rules') {
    displayRules();
  } else {
    console.log('Available commands:');
    console.log('  /x or /x all - Run all checks');
    console.log('  /x env - Check environment variables');
    console.log('  /x build - Check build status');
    console.log('  /x api - Test API endpoints');
    console.log('  /x rules - Display critical rules');
  }
}

// Get command from command line args
const command = process.argv[2] || '/x';
runChecks(command);
