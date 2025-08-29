#!/usr/bin/env node

/**
 * ML Model Evaluation Script
 *
 * Evaluates trained models on test datasets
 * Generates performance metrics and reports
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');

class ModelEvaluator {
  constructor() {
    this.modelsDir = path.join(__dirname, '..', 'models');
    this.dataDir = path.join(__dirname, '..', 'data');
    this.resultsDir = path.join(__dirname, '..', 'results');
  }

  async evaluateAllModels() {
    console.log('📊 Starting model evaluation...\n');

    const results = {};

    try {
      // Evaluate tread depth model
      if (await this.modelExists('tread-depth-model')) {
        console.log('🔍 Evaluating Tread Depth Model...');
        results.treadDepth = await this.evaluateTreadDepthModel();
      }

      // Evaluate condition classifier
      if (await this.modelExists('condition-classifier-model')) {
        console.log('🔍 Evaluating Condition Classifier...');
        results.conditionClassifier = await this.evaluateConditionClassifier();
      }

      // Generate comprehensive report
      const report = this.generateReport(results);
      await this.saveReport(report);

      console.log('\n✅ Model evaluation complete!');
      console.log(`📈 Results saved to: ${this.resultsDir}`);

      return results;

    } catch (error) {
      console.error('❌ Evaluation failed:', error);
      throw error;
    }
  }

  async evaluateTreadDepthModel() {
    try {
      const model = await this.loadModel('tread-depth-model');
      const testData = await this.loadTestData('tread-depth');

      if (!testData || testData.length === 0) {
        console.log('⚠️  No test data found for tread depth model');
        return this.getEmptyMetrics();
      }

      const predictions = [];
      const actuals = [];

      for (const sample of testData) {
        const prediction = model.predict(sample.image);
        const predictedValue = prediction.dataSync()[0];

        predictions.push(predictedValue);
        actuals.push(sample.label);

        prediction.dispose();
        sample.image.dispose();
      }

      const metrics = this.calculateRegressionMetrics(predictions, actuals);

      console.log(`📈 Tread Depth - MSE: ${metrics.mse.toFixed(4)}, MAE: ${metrics.mae.toFixed(4)}`);

      model.dispose();
      return metrics;

    } catch (error) {
      console.error('❌ Tread depth evaluation error:', error);
      return this.getEmptyMetrics();
    }
  }

  async evaluateConditionClassifier() {
    try {
      const model = await this.loadModel('condition-classifier-model');
      const testData = await this.loadTestData('condition');

      if (!testData || testData.length === 0) {
        console.log('⚠️  No test data found for condition classifier');
        return this.getEmptyMetrics();
      }

      const predictions = [];
      const actuals = [];

      for (const sample of testData) {
        const prediction = model.predict(sample.image);
        const predictedClass = prediction.argMax(1).dataSync()[0];
        const actualClass = sample.label.argMax(1).dataSync()[0];

        predictions.push(predictedClass);
        actuals.push(actualClass);

        prediction.dispose();
        sample.image.dispose();
        sample.label.dispose();
      }

      const metrics = this.calculateClassificationMetrics(predictions, actuals);

      console.log(`📈 Condition Classifier - Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);

      model.dispose();
      return metrics;

    } catch (error) {
      console.error('❌ Condition classifier evaluation error:', error);
      return this.getEmptyMetrics();
    }
  }

  async loadModel(modelName) {
    const modelPath = path.join(this.modelsDir, modelName);
    return await tf.loadLayersModel(`file://${modelPath}/model.json`);
  }

  async modelExists(modelName) {
    try {
      const modelPath = path.join(this.modelsDir, modelName, 'model.json');
      await fs.access(modelPath);
      return true;
    } catch {
      return false;
    }
  }

  async loadTestData(type) {
    // Load test data from data/test directory
    const testDataPath = path.join(this.dataDir, 'test', `${type}-test.json`);

    try {
      const testDataJson = await fs.readFile(testDataPath, 'utf8');
      const testData = JSON.parse(testDataJson);

      // Convert to tensors (simplified - in production this would be more robust)
      const processedData = [];

      for (const sample of testData.samples) {
        if (type === 'tread-depth') {
          processedData.push({
            image: tf.randomUniform([1, 224, 224, 3]), // Placeholder
            label: sample.treadDepth
          });
        } else if (type === 'condition') {
          processedData.push({
            image: tf.randomUniform([1, 224, 224, 3]), // Placeholder
            label: tf.tensor1d(sample.conditionOneHot)
          });
        }
      }

      return processedData;

    } catch (error) {
      console.log(`⚠️  Test data not found: ${testDataPath}`);
      return [];
    }
  }

  calculateRegressionMetrics(predictions, actuals) {
    const n = predictions.length;
    let mse = 0;
    let mae = 0;

    for (let i = 0; i < n; i++) {
      const diff = predictions[i] - actuals[i];
      mse += diff * diff;
      mae += Math.abs(diff);
    }

    mse /= n;
    mae /= n;

    return {
      mse,
      mae,
      rmse: Math.sqrt(mse),
      r2: this.calculateR2(predictions, actuals)
    };
  }

  calculateClassificationMetrics(predictions, actuals) {
    const n = predictions.length;
    let correct = 0;
    const confusionMatrix = {};

    // Calculate accuracy
    for (let i = 0; i < n; i++) {
      if (predictions[i] === actuals[i]) {
        correct++;
      }

      // Build confusion matrix
      const pred = predictions[i];
      const actual = actuals[i];

      if (!confusionMatrix[actual]) {
        confusionMatrix[actual] = {};
      }
      if (!confusionMatrix[actual][pred]) {
        confusionMatrix[actual][pred] = 0;
      }
      confusionMatrix[actual][pred]++;
    }

    const accuracy = correct / n;

    return {
      accuracy,
      precision: this.calculatePrecision(confusionMatrix),
      recall: this.calculateRecall(confusionMatrix),
      f1Score: this.calculateF1Score(confusionMatrix),
      confusionMatrix
    };
  }

  calculateR2(predictions, actuals) {
    const n = predictions.length;
    const mean = actuals.reduce((a, b) => a + b, 0) / n;

    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      ssRes += Math.pow(predictions[i] - actuals[i], 2);
      ssTot += Math.pow(actuals[i] - mean, 2);
    }

    return 1 - (ssRes / ssTot);
  }

  calculatePrecision(confusionMatrix) {
    // Simplified precision calculation
    let totalPrecision = 0;
    let classCount = 0;

    for (const actualClass in confusionMatrix) {
      const row = confusionMatrix[actualClass];
      let truePositives = 0;
      let predictedPositives = 0;

      for (const predictedClass in row) {
        if (predictedClass === actualClass) {
          truePositives = row[predictedClass];
        }
        predictedPositives += row[predictedClass];
      }

      if (predictedPositives > 0) {
        totalPrecision += truePositives / predictedPositives;
        classCount++;
      }
    }

    return classCount > 0 ? totalPrecision / classCount : 0;
  }

  calculateRecall(confusionMatrix) {
    // Simplified recall calculation
    let totalRecall = 0;
    let classCount = 0;

    for (const actualClass in confusionMatrix) {
      const row = confusionMatrix[actualClass];
      let truePositives = 0;
      let actualPositives = 0;

      for (const predictedClass in row) {
        if (predictedClass === actualClass) {
          truePositives = row[predictedClass];
        }
      }

      for (const rowClass in confusionMatrix) {
        if (confusionMatrix[rowClass][actualClass]) {
          actualPositives += confusionMatrix[rowClass][actualClass];
        }
      }

      if (actualPositives > 0) {
        totalRecall += truePositives / actualPositives;
        classCount++;
      }
    }

    return classCount > 0 ? totalRecall / classCount : 0;
  }

  calculateF1Score(confusionMatrix) {
    const precision = this.calculatePrecision(confusionMatrix);
    const recall = this.calculateRecall(confusionMatrix);

    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }

  getEmptyMetrics() {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      mse: 0,
      mae: 0,
      rmse: 0,
      r2: 0
    };
  }

  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      models: {},
      summary: {},
      recommendations: []
    };

    // Process tread depth results
    if (results.treadDepth) {
      report.models.treadDepth = {
        metrics: results.treadDepth,
        status: results.treadDepth.mse < 1.0 ? 'good' : 'needs_improvement'
      };
    }

    // Process condition classifier results
    if (results.conditionClassifier) {
      report.models.conditionClassifier = {
        metrics: results.conditionClassifier,
        status: results.conditionClassifier.accuracy > 0.8 ? 'good' : 'needs_improvement'
      };
    }

    // Generate summary
    const accuracies = Object.values(results)
      .map(r => r.accuracy || 0)
      .filter(acc => acc > 0);

    report.summary.averageAccuracy = accuracies.length > 0
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      : 0;

    report.summary.modelCount = Object.keys(results).length;
    report.summary.overallStatus = report.summary.averageAccuracy > 0.75 ? 'good' : 'needs_improvement';

    // Generate recommendations
    if (report.summary.averageAccuracy < 0.7) {
      report.recommendations.push('Consider collecting more training data');
      report.recommendations.push('Try different model architectures');
      report.recommendations.push('Experiment with data augmentation techniques');
    }

    if (Object.values(results).some(r => r.accuracy < 0.8)) {
      report.recommendations.push('Model may benefit from hyperparameter tuning');
    }

    report.recommendations.push('Continue monitoring model performance in production');

    return report;
  }

  async saveReport(report) {
    await fs.mkdir(this.resultsDir, { recursive: true });

    const reportPath = path.join(this.resultsDir, `evaluation-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Evaluation report saved: ${reportPath}`);

    // Also save a summary for quick reference
    const summaryPath = path.join(this.resultsDir, 'latest-evaluation-summary.json');
    const summary = {
      timestamp: report.timestamp,
      averageAccuracy: report.summary.averageAccuracy,
      overallStatus: report.summary.overallStatus,
      recommendations: report.recommendations
    };
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  }

  async run() {
    try {
      await this.evaluateAllModels();
    } catch (error) {
      console.error('❌ Evaluation script failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const evaluator = new ModelEvaluator();
  evaluator.run();
}

module.exports = ModelEvaluator;
