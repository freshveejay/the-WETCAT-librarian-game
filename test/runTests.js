#!/usr/bin/env node

/**
 * Test Runner Script for WETCAT Librarian
 * 
 * This script provides a convenient way to run different test suites
 * with various options.
 * 
 * Usage:
 *   npm test                    # Run all tests
 *   npm test unit              # Run only unit tests
 *   npm test integration       # Run only integration tests
 *   npm test -- --watch        # Run tests in watch mode
 *   npm test -- --coverage     # Run tests with coverage
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const additionalArgs = args.slice(1);

// Define test patterns
const testPatterns = {
  all: ['test/**/*.test.js'],
  unit: ['test/unit/**/*.test.js'],
  integration: ['test/integration/**/*.test.js'],
  player: ['test/unit/Player.test.js'],
  mechanics: ['test/unit/GameMechanics.test.js'],
  web3: ['test/integration/Web3Integration.test.js'],
  worldid: ['test/integration/WorldIDFlow.test.js']
};

// Build vitest command
const pattern = testPatterns[testType] || testPatterns.all;
const vitestArgs = ['vitest', 'run', ...pattern, ...additionalArgs];

// Add common options
if (!additionalArgs.includes('--watch') && !additionalArgs.includes('-w')) {
  vitestArgs.splice(1, 1); // Remove 'run' for watch mode
}

console.log(`Running ${testType} tests...`);
console.log(`Command: npx ${vitestArgs.join(' ')}`);
console.log('');

// Run vitest
const vitest = spawn('npx', vitestArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

vitest.on('exit', (code) => {
  process.exit(code);
});

// Handle errors
vitest.on('error', (err) => {
  console.error('Failed to start test runner:', err);
  process.exit(1);
});