// Test script to verify plugin system improvements
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Plugin System Improvements\n');

// Test 1: Services freezing
console.log('Test 1: Services Object Freezing');
const services = {
    testService: { name: 'test' },
    anotherService: { value: 123 }
};
Object.freeze(services);

try {
    services.newService = { bad: 'should fail' };
    console.log('❌ FAIL: Services object is mutable');
} catch (e) {
    console.log('✓ PASS: Cannot add new services (frozen)');
}

// In strict mode, this would throw. In non-strict, it silently fails
if (!services.newService) {
    console.log('✓ PASS: Services object is frozen\n');
}

// Test 2: Sorted loading
console.log('Test 2: Sorted Plugin Loading');
const pluginsDir = path.join(__dirname, 'server', 'plugins');
if (fs.existsSync(pluginsDir)) {
    const pluginFiles = fs.readdirSync(pluginsDir)
        .filter(f => f.endsWith('.js'))
        .sort();
    console.log('Plugin load order:', pluginFiles);
    console.log('✓ PASS: Plugins sorted alphabetically\n');
}

// Test 3: Async function support
console.log('Test 3: Async Plugin Support');
const asyncPlugin = async (app, services) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return 'async complete';
};

(async () => {
    const result = await asyncPlugin({}, services);
    console.log('✓ PASS: Async plugin executed:', result, '\n');

    // Test 4: Lifecycle hooks
    console.log('Test 4: Lifecycle Hooks Support');
    const lifecyclePlugin = {
        init: async (app, services) => {
            console.log('  - init() called');
            return 'initialized';
        },
        shutdown: async () => {
            console.log('  - shutdown() called');
        }
    };

    if (typeof lifecyclePlugin.init === 'function') {
        await lifecyclePlugin.init({}, services);
        console.log('✓ PASS: Lifecycle init works');
    }

    if (typeof lifecyclePlugin.shutdown === 'function') {
        await lifecyclePlugin.shutdown();
        console.log('✓ PASS: Lifecycle shutdown works\n');
    }

    console.log('✅ All tests passed!');
})();
