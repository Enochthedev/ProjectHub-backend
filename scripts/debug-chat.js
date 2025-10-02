#!/usr/bin/env node

/**
 * Debug script for chat message persistence issue
 * Run with: node scripts/debug-chat.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ProjectHub Chat Debug Script\n');

// Check if backend is running
async function checkBackend() {
    try {
        const response = await fetch('http://localhost:3000/api/health');
        if (response.ok) {
            console.log('✅ Backend is running');
            return true;
        } else {
            console.log('❌ Backend responded with error:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Backend is not running or not accessible');
        console.log('   Start with: npm run start:dev');
        return false;
    }
}

// Check AI endpoints
async function checkAIEndpoints() {
    console.log('\n📡 Testing AI Endpoints:');

    try {
        // Test conversations endpoint
        const convResponse = await fetch('http://localhost:3000/api/ai/conversations');
        console.log(`   GET /api/ai/conversations: ${convResponse.status}`);

        if (convResponse.ok) {
            const data = await convResponse.json();
            console.log(`   Found ${data.conversations?.length || 0} conversations`);
        }
    } catch (error) {
        console.log('   ❌ Conversations endpoint failed:', error.message);
    }

    try {
        // Test ask endpoint with a simple query
        const askResponse = await fetch('http://localhost:3000/api/ai/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'test debug message' })
        });
        console.log(`   POST /api/ai/ask: ${askResponse.status}`);
    } catch (error) {
        console.log('   ❌ Ask endpoint failed:', error.message);
    }
}

// Check frontend store file
function checkFrontendStore() {
    console.log('\n📁 Checking Frontend Store:');

    const storePath = path.join(__dirname, '../frontend/src/stores/ai-assistant.ts');

    if (fs.existsSync(storePath)) {
        console.log('✅ AI Assistant store file exists');

        const content = fs.readFileSync(storePath, 'utf8');

        // Check for persistence config
        if (content.includes('partialize')) {
            console.log('✅ Persistence configuration found');

            if (content.includes('messages:')) {
                console.log('✅ Messages included in persistence');
            } else {
                console.log('❌ Messages NOT included in persistence');
            }

            if (content.includes('version:')) {
                console.log('✅ Storage version control found');
            } else {
                console.log('⚠️  No storage version control');
            }
        } else {
            console.log('❌ No persistence configuration found');
        }
    } else {
        console.log('❌ AI Assistant store file not found');
    }
}

// Check database entities
function checkEntities() {
    console.log('\n🗄️  Checking Database Entities:');

    const entitiesDir = path.join(__dirname, '../src/entities');

    const requiredEntities = [
        'conversation.entity.ts',
        'message.entity.ts',
        'user.entity.ts'
    ];

    requiredEntities.forEach(entity => {
        const entityPath = path.join(entitiesDir, entity);
        if (fs.existsSync(entityPath)) {
            console.log(`✅ ${entity} exists`);
        } else {
            console.log(`❌ ${entity} missing`);
        }
    });
}

// Main execution
async function main() {
    const backendRunning = await checkBackend();

    if (backendRunning) {
        await checkAIEndpoints();
    }

    checkFrontendStore();
    checkEntities();

    console.log('\n📋 Debugging Tips:');
    console.log('1. Check browser localStorage for "ai-assistant-storage"');
    console.log('2. Open browser dev tools and check Network tab for API calls');
    console.log('3. Check backend logs for any errors');
    console.log('4. Verify database has conversation and message data');
    console.log('\n🔧 If messages still not persisting:');
    console.log('   - Clear localStorage and test again');
    console.log('   - Check if API returns message history');
    console.log('   - Verify Zustand store is properly hydrated');
}

main().catch(console.error);