#!/usr/bin/env node

/**
 * Initialize Continuous Learning System
 *
 * Sets up the continuous learning infrastructure
 * Should be run when the application starts
 */

const { continuousLearning } = require('../dist/lib/ml/continuous-learning');

async function initializeContinuousLearning() {
  console.log('🚀 Initializing Continuous Learning System...');

  try {
    // Initialize the continuous learning system
    await continuousLearning.initialize();

    console.log('✅ Continuous Learning System initialized successfully');
    console.log('🧠 AI will now learn from every tire photo you take');

    // Set up periodic stats logging
    setInterval(async () => {
      try {
        const stats = await continuousLearning.getLearningStats();
        console.log(`📊 Learning Stats: ${stats.totalSamples} samples, ${stats.userFeedbackCount} ratings`);
      } catch (error) {
        console.error('❌ Stats logging error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

  } catch (error) {
    console.error('❌ Continuous Learning initialization failed:', error);
    console.log('⚠️  Continuing without continuous learning features');
  }
}

// Run if called directly
if (require.main === module) {
  initializeContinuousLearning();
}

module.exports = initializeContinuousLearning;
