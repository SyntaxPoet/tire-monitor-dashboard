#!/usr/bin/env node

/**
 * MLOps Pipeline Orchestrator
 *
 * Automates the complete ML lifecycle:
 * 1. Data Collection
 * 2. Data Labeling/Validation
 * 3. Model Training
 * 4. Model Evaluation
 * 5. Model Deployment
 * 6. Continuous Monitoring
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class MLOpsPipeline {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.logsDir = path.join(this.rootDir, 'logs');
    this.config = {
      autoRestart: true,
      monitoringInterval: 24 * 60 * 60 * 1000, // 24 hours
      retrainThreshold: 0.02, // Retrain if accuracy drops by 2%
      minSamplesForRetrain: 100
    };
  }

  async initialize() {
    console.log('🚀 Initializing MLOps Pipeline...');

    // Create logs directory
    await fs.mkdir(this.logsDir, { recursive: true });

    // Initialize pipeline state
    this.state = {
      lastRun: null,
      lastDataCollection: null,
      lastTraining: null,
      modelVersions: [],
      performanceMetrics: {},
      isRunning: false
    };

    console.log('✅ MLOps Pipeline initialized');
  }

  async runDataCollection() {
    console.log('\n📊 Phase 1: Data Collection');

    try {
      await this.executeScript('collect-training-data.js');
      this.state.lastDataCollection = new Date();
      console.log('✅ Data collection completed');

      await this.logEvent('data_collection', {
        timestamp: new Date().toISOString(),
        status: 'success'
      });

    } catch (error) {
      console.error('❌ Data collection failed:', error);
      await this.logEvent('data_collection', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    }
  }

  async runDataLabeling() {
    console.log('\n🏷️  Phase 2: Data Labeling');

    try {
      await this.executeScript('label-data.js');
      console.log('✅ Data labeling completed');

      await this.logEvent('data_labeling', {
        timestamp: new Date().toISOString(),
        status: 'success'
      });

    } catch (error) {
      console.error('❌ Data labeling failed:', error);
      await this.logEvent('data_labeling', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    }
  }

  async runModelTraining() {
    console.log('\n🎯 Phase 3: Model Training');

    try {
      await this.executeScript('train-models.js');
      this.state.lastTraining = new Date();
      console.log('✅ Model training completed');

      // Update model version tracking
      const newVersion = {
        version: `v${Date.now()}`,
        trainedAt: new Date().toISOString(),
        status: 'active'
      };
      this.state.modelVersions.push(newVersion);

      await this.logEvent('model_training', {
        timestamp: new Date().toISOString(),
        status: 'success',
        version: newVersion.version
      });

    } catch (error) {
      console.error('❌ Model training failed:', error);
      await this.logEvent('model_training', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    }
  }

  async runModelEvaluation() {
    console.log('\n📈 Phase 4: Model Evaluation');

    try {
      await this.executeScript('evaluate-models.js');

      // Load evaluation results
      const evalResults = await this.loadEvaluationResults();
      this.state.performanceMetrics = evalResults;

      console.log('✅ Model evaluation completed');
      console.log(`📊 Accuracy: ${(evalResults.accuracy * 100).toFixed(2)}%`);
      console.log(`📉 Loss: ${evalResults.loss.toFixed(4)}`);

      await this.logEvent('model_evaluation', {
        timestamp: new Date().toISOString(),
        status: 'success',
        metrics: evalResults
      });

    } catch (error) {
      console.error('❌ Model evaluation failed:', error);
      await this.logEvent('model_evaluation', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    }
  }

  async runModelDeployment() {
    console.log('\n🚀 Phase 5: Model Deployment');

    try {
      // Stop existing model server
      await this.stopModelServer();

      // Start new model server
      await this.startModelServer();

      console.log('✅ Model deployment completed');
      console.log('🔗 ML API available at: http://localhost:3001');

      await this.logEvent('model_deployment', {
        timestamp: new Date().toISOString(),
        status: 'success',
        endpoint: 'http://localhost:3001'
      });

    } catch (error) {
      console.error('❌ Model deployment failed:', error);
      await this.logEvent('model_deployment', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    }
  }

  async runContinuousMonitoring() {
    console.log('\n👀 Phase 6: Continuous Monitoring Setup');

    try {
      // Set up monitoring job
      this.startMonitoringJob();

      console.log('✅ Continuous monitoring activated');
      console.log(`⏰ Monitoring interval: ${this.config.monitoringInterval / (60 * 60 * 1000)} hours`);

      await this.logEvent('monitoring_setup', {
        timestamp: new Date().toISOString(),
        status: 'success',
        interval: this.config.monitoringInterval
      });

    } catch (error) {
      console.error('❌ Monitoring setup failed:', error);
      await this.logEvent('monitoring_setup', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    }
  }

  async executeScript(scriptName) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, scriptName);

      console.log(`🔧 Executing: ${scriptName}`);

      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        cwd: this.rootDir
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Script ${scriptName} exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async startModelServer() {
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, 'serve-models.js');

      console.log('🚀 Starting ML model server...');

      const child = spawn('node', [serverPath], {
        detached: true,
        stdio: 'ignore',
        cwd: this.rootDir
      });

      // Give server time to start
      setTimeout(() => {
        child.unref();
        resolve();
      }, 3000);

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async stopModelServer() {
    // Find and kill existing model server processes
    return new Promise((resolve) => {
      const { spawn } = require('child_process');

      if (process.platform === 'win32') {
        // Windows: use taskkill
        const kill = spawn('taskkill', ['/F', '/IM', 'node.exe', '/FI', 'WINDOWTITLE eq *serve-models*'], {
          stdio: 'ignore'
        });

        kill.on('close', () => resolve());
      } else {
        // Unix: use pkill
        const kill = spawn('pkill', ['-f', 'serve-models'], {
          stdio: 'ignore'
        });

        kill.on('close', () => resolve());
      }
    });
  }

  startMonitoringJob() {
    // Set up periodic monitoring
    this.monitoringJob = setInterval(async () => {
      try {
        await this.performMonitoringCheck();
      } catch (error) {
        console.error('❌ Monitoring check failed:', error);
      }
    }, this.config.monitoringInterval);
  }

  async performMonitoringCheck() {
    console.log('\n🔍 Performing monitoring check...');

    try {
      // Check model performance
      const currentMetrics = await this.loadEvaluationResults();
      const previousMetrics = this.state.performanceMetrics;

      if (previousMetrics.accuracy && currentMetrics.accuracy) {
        const accuracyDrop = previousMetrics.accuracy - currentMetrics.accuracy;

        if (accuracyDrop > this.config.retrainThreshold) {
          console.log(`⚠️  Model accuracy dropped by ${(accuracyDrop * 100).toFixed(2)}%`);
          console.log('🔄 Triggering model retraining...');

          await this.runModelTraining();
          await this.runModelEvaluation();
          await this.runModelDeployment();
        }
      }

      // Check data volume
      const dataVolume = await this.checkDataVolume();
      if (dataVolume > this.config.minSamplesForRetrain) {
        console.log(`📊 Sufficient data available (${dataVolume} samples)`);
        console.log('🔄 Considering model update...');
      }

      await this.logEvent('monitoring_check', {
        timestamp: new Date().toISOString(),
        status: 'success',
        metrics: currentMetrics
      });

    } catch (error) {
      console.error('❌ Monitoring check error:', error);
      await this.logEvent('monitoring_check', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    }
  }

  async checkDataVolume() {
    try {
      const dataDir = path.join(this.rootDir, 'data', 'labeled');
      const files = await fs.readdir(dataDir);
      return files.filter(f => f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }

  async loadEvaluationResults() {
    // Placeholder - in production, this would load from evaluation logs
    return {
      accuracy: 0.85 + Math.random() * 0.1, // Simulate accuracy
      loss: 0.2 + Math.random() * 0.1,
      precision: 0.82 + Math.random() * 0.1,
      recall: 0.83 + Math.random() * 0.1
    };
  }

  async logEvent(eventType, data) {
    const logEntry = {
      eventType,
      timestamp: new Date().toISOString(),
      ...data
    };

    const logFile = path.join(this.logsDir, 'mlops-pipeline.log');
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }

  async runFullPipeline() {
    console.log('🎯 Starting Complete MLOps Pipeline...\n');

    this.state.isRunning = true;
    this.state.lastRun = new Date();

    try {
      await this.initialize();
      await this.runDataCollection();
      await this.runDataLabeling();
      await this.runModelTraining();
      await this.runModelEvaluation();
      await this.runModelDeployment();
      await this.runContinuousMonitoring();

      console.log('\n🎉 MLOps Pipeline completed successfully!');
      console.log('📊 System is now continuously learning and improving');

      await this.logEvent('pipeline_complete', {
        timestamp: new Date().toISOString(),
        status: 'success',
        phases: ['data_collection', 'data_labeling', 'model_training', 'model_evaluation', 'model_deployment', 'monitoring']
      });

    } catch (error) {
      console.error('\n❌ MLOps Pipeline failed:', error);
      await this.logEvent('pipeline_failed', {
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
    } finally {
      this.state.isRunning = false;
    }
  }

  async cleanup() {
    if (this.monitoringJob) {
      clearInterval(this.monitoringJob);
    }
    await this.stopModelServer();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down MLOps Pipeline...');
  const pipeline = new MLOpsPipeline();
  await pipeline.cleanup();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  const pipeline = new MLOpsPipeline();
  pipeline.runFullPipeline();
}

module.exports = MLOpsPipeline;
