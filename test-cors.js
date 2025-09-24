#!/usr/bin/env node

// Test CORS - script per verificare la risoluzione del problema
const http = require('http');

const testCORS = () => {
  console.log('🔍 Testing CORS configuration...\n');
  
  // Test OPTIONS preflight request
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Preflight OPTIONS Response: ${res.statusCode}`);
    console.log('📋 Headers:');
    Object.keys(res.headers).forEach(key => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`   ${key}: ${res.headers[key]}`);
      }
    });
    
    // Test actual POST request
    testPOST();
  });

  req.on('error', (err) => {
    console.error(`❌ CORS Test Error: ${err.message}`);
    console.log('\n💡 Per risolvere:');
    console.log('1. Assicurati che il server backend sia avviato (porta 5000)');
    console.log('2. Le correzioni CORS sono state applicate a backend/server.js');
    console.log('3. Riavvia il server backend e riprova il login');
  });

  req.end();
};

const testPOST = () => {
  console.log('\n🔍 Testing POST request...');
  
  const postData = JSON.stringify({
    username: 'test',
    password: 'test123'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ POST Response: ${res.statusCode}`);
    console.log('📋 CORS Headers:');
    Object.keys(res.headers).forEach(key => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`   ${key}: ${res.headers[key]}`);
      }
    });
    
    if (res.statusCode === 401) {
      console.log('\n✅ CORS OK! Server responde (401 = credenziali errate, ma CORS funziona)');
    } else if (res.statusCode === 403) {
      console.log('\n❌ CORS bloccato ancora');
    }
  });

  req.on('error', (err) => {
    console.error(`❌ POST Test Error: ${err.message}`);
  });

  req.write(postData);
  req.end();
};

// Avvia test
testCORS();
