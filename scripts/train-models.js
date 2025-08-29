#!/usr/bin/env node

/**
 * ML Model Training Script
 *
 * Trains TensorFlow.js models for tire analysis
 * Supports multiple model architectures and tasks
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');

class TireModelTrainer {
  constructor() {
    this.modelsDir = path.join(__dirname, '..', 'models');
    this.dataDir = path.join(__dirname, '..', 'data');
    this.modelConfigs = {
      treadDepth: {
        inputShape: [224, 224, 3],
        outputUnits: 1,
        loss: 'meanSquaredError',
        metrics: ['mse', 'mae']
      },
      conditionClassifier: {
        inputShape: [224, 224, 3],
        outputUnits: 5, // excellent, good, fair, poor, critical
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      },
      wearPatternDetector: {
        inputShape: [224, 224, 3],
        outputUnits: 4, // uniform, inner, outer, random
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      }
    };
  }

  async loadTrainingData() {
    console.log('📂 Loading training data...');

    const trainingData = [];
    const labels = [];

    try {
      // Load processed data from data collection script
      const labeledDir = path.join(this.dataDir, 'labeled');
      const files = await fs.readdir(labeledDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(labeledDir, file);
          const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

          if (data.labels && Object.keys(data.labels).length > 0) {
            trainingData.push(data);
            labels.push(data.labels);
          }
        }
      }

      console.log(`✅ Loaded ${trainingData.length} training samples`);
      return { trainingData, labels };

    } catch (error) {
      console.error('❌ Error loading training data:', error);
      return { trainingData: [], labels: [] };
    }
  }

  createTreadDepthModel() {
    console.log('🏗️  Building tread depth regression model...');

    const model = tf.sequential();

    // Convolutional layers for feature extraction
    model.add(tf.layers.conv2d({
      inputShape: this.modelConfigs.treadDepth.inputShape,
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Flatten and dense layers
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 512, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Output layer for regression
    model.add(tf.layers.dense({
      units: this.modelConfigs.treadDepth.outputUnits,
      activation: 'linear'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: this.modelConfigs.treadDepth.loss,
      metrics: this.modelConfigs.treadDepth.metrics
    });

    return model;
  }

  createConditionClassifier() {
    console.log('🏗️  Building tire condition classification model...');

    const model = tf.sequential();

    // Feature extraction layers
    model.add(tf.layers.conv2d({
      inputShape: this.modelConfigs.conditionClassifier.inputShape,
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Flatten and dense layers
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 512, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));

    // Output layer for classification
    model.add(tf.layers.dense({
      units: this.modelConfigs.conditionClassifier.outputUnits,
      activation: 'softmax'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: this.modelConfigs.conditionClassifier.loss,
      metrics: this.modelConfigs.conditionClassifier.metrics
    });

    return model;
  }

  async preprocessImages(trainingData) {
    console.log('🖼️  Preprocessing images...');

    const processedImages = [];
    const labels = [];

    for (const data of trainingData) {
      try {
        // Load and preprocess image
        const imagePath = path.join(__dirname, '..', data.imagePath);
        const imageBuffer = await fs.readFile(imagePath);

        // Decode and resize image
        const imageTensor = tf.node.decodeImage(imageBuffer, 3);
        const resizedImage = tf.image.resizeBilinear(imageTensor, [224, 224]);

        // Normalize pixel values
        const normalizedImage = resizedImage.div(255.0);

        processedImages.push(normalizedImage);

        // Extract labels
        if (data.labels.treadDepth !== undefined) {
          labels.push([data.labels.treadDepth]);
        }

        // Clean up tensors
        imageTensor.dispose();
        resizedImage.dispose();

      } catch (error) {
        console.error(`❌ Error processing image ${data.id}:`, error);
      }
    }

    console.log(`✅ Preprocessed ${processedImages.length} images`);
    return { images: processedImages, labels };
  }

  async trainTreadDepthModel() {
    console.log('\n🎯 Training Tread Depth Model...');

    try {
      const { trainingData } = await this.loadTrainingData();

      if (trainingData.length === 0) {
        console.log('⚠️  No training data found. Run data collection first.');
        return;
      }

      const { images, labels } = await this.preprocessImages(trainingData);

      if (images.length === 0) {
        console.log('⚠️  No valid images found for training.');
        return;
      }

      const model = this.createTreadDepthModel();

      // Convert to tensors
      const xs = tf.stack(images);
      const ys = tf.tensor2d(labels);

      // Train the model
      await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
          }
        }
      });

      // Save the model
      const modelPath = path.join(this.modelsDir, 'tread-depth-model');
      await model.save(`file://${modelPath}`);

      console.log(`💾 Tread depth model saved to: ${modelPath}`);

      // Clean up tensors
      xs.dispose();
      ys.dispose();
      images.forEach(img => img.dispose());

    } catch (error) {
      console.error('❌ Tread depth training failed:', error);
    }
  }

  async trainConditionClassifier() {
    console.log('\n🎯 Training Condition Classification Model...');

    try {
      const { trainingData } = await this.loadTrainingData();

      if (trainingData.length === 0) {
        console.log('⚠️  No training data found. Run data collection first.');
        return;
      }

      const model = this.createConditionClassifier();

      // For now, use synthetic data for training
      // In production, this would use real labeled data
      const syntheticData = this.generateSyntheticTrainingData(1000);
      const { images, labels } = syntheticData;

      const xs = tf.stack(images);
      const ys = tf.tensor2d(labels);

      await model.fit(xs, ys, {
        epochs: 30,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: accuracy = ${(logs.acc * 100).toFixed(2)}%, val_accuracy = ${(logs.val_acc * 100).toFixed(2)}%`);
          }
        }
      });

      const modelPath = path.join(this.modelsDir, 'condition-classifier-model');
      await model.save(`file://${modelPath}`);

      console.log(`💾 Condition classifier saved to: ${modelPath}`);

    } catch (error) {
      console.error('❌ Condition classifier training failed:', error);
    }
  }

  generateSyntheticTrainingData(count) {
    console.log(`🎨 Generating ${count} synthetic training samples...`);

    const images = [];
    const labels = [];

    for (let i = 0; i < count; i++) {
      // Generate synthetic image tensor (224x224x3)
      const image = tf.randomUniform([224, 224, 3], 0, 1);
      images.push(image);

      // Generate random classification labels
      const label = Array(5).fill(0);
      label[Math.floor(Math.random() * 5)] = 1; // One-hot encoding
      labels.push(label);
    }

    return { images, labels };
  }

  async run() {
    console.log('🚀 Starting ML model training pipeline...\n');

    try {
      // Ensure models directory exists
      await fs.mkdir(this.modelsDir, { recursive: true });

      // Train all models
      await this.trainTreadDepthModel();
      await this.trainConditionClassifier();

      console.log('\n✅ All models trained successfully!');
      console.log(`📊 Models saved to: ${this.modelsDir}`);

    } catch (error) {
      console.error('❌ Training pipeline failed:', error);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const trainer = new TireModelTrainer();
  trainer.run();
}

module.exports = TireModelTrainer;
