#!/usr/bin/env node

/**
 * ML Model Serving Script
 *
 * Loads trained TensorFlow.js models and provides inference API
 * Integrates with the Next.js application for real-time predictions
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class ModelServer {
  constructor() {
    this.app = express();
    this.port = process.env.ML_PORT || 3001;
    this.modelsDir = path.join(__dirname, '..', 'models');
    this.models = {};

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    // Configure multer for file uploads
    const storage = multer.memoryStorage();
    this.upload = multer({
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'));
        }
      }
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        models: Object.keys(this.models),
        timestamp: new Date().toISOString()
      });
    });

    // Tire analysis endpoint
    this.app.post('/analyze', this.upload.single('image'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        console.log('🔍 Analyzing tire image...');
        const results = await this.analyzeTireImage(req.file.buffer);

        res.json({
          success: true,
          analysis: results,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Analysis error:', error);
        res.status(500).json({
          error: 'Analysis failed',
          details: error.message
        });
      }
    });

    // Batch analysis endpoint
    this.app.post('/analyze/batch', this.upload.array('images', 10), async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No image files provided' });
        }

        console.log(`🔍 Analyzing ${req.files.length} tire images...`);
        const results = [];

        for (const file of req.files) {
          const analysis = await this.analyzeTireImage(file.buffer);
          results.push({
            filename: file.originalname,
            analysis
          });
        }

        res.json({
          success: true,
          results,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Batch analysis error:', error);
        res.status(500).json({
          error: 'Batch analysis failed',
          details: error.message
        });
      }
    });

    // Model info endpoint
    this.app.get('/models', (req, res) => {
      const modelInfo = {};

      Object.keys(this.models).forEach(modelName => {
        const model = this.models[modelName];
        modelInfo[modelName] = {
          loaded: true,
          inputShape: model.inputs[0].shape,
          outputShape: model.outputs[0].shape
        };
      });

      res.json(modelInfo);
    });
  }

  async loadModels() {
    console.log('🤖 Loading ML models...');

    try {
      // Load tread depth model
      const treadDepthPath = path.join(this.modelsDir, 'tread-depth-model');
      if (await this.modelExists(treadDepthPath)) {
        this.models.treadDepth = await tf.loadLayersModel(`file://${treadDepthPath}/model.json`);
        console.log('✅ Tread depth model loaded');
      } else {
        console.log('⚠️  Tread depth model not found');
      }

      // Load condition classifier
      const conditionPath = path.join(this.modelsDir, 'condition-classifier-model');
      if (await this.modelExists(conditionPath)) {
        this.models.conditionClassifier = await tf.loadLayersModel(`file://${conditionPath}/model.json`);
        console.log('✅ Condition classifier loaded');
      } else {
        console.log('⚠️  Condition classifier not found');
      }

    } catch (error) {
      console.error('❌ Error loading models:', error);
    }
  }

  async modelExists(modelPath) {
    try {
      await fs.access(path.join(modelPath, 'model.json'));
      return true;
    } catch {
      return false;
    }
  }

  async preprocessImage(imageBuffer) {
    try {
      // Resize image to 224x224 using Sharp
      const resizedBuffer = await sharp(imageBuffer)
        .resize(224, 224, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Convert to tensor
      const imageTensor = tf.node.decodeImage(resizedBuffer, 3);

      // Normalize to [0, 1]
      const normalizedTensor = imageTensor.div(255.0);

      // Add batch dimension
      const batchedTensor = normalizedTensor.expandDims(0);

      // Clean up intermediate tensors
      imageTensor.dispose();
      normalizedTensor.dispose();

      return batchedTensor;

    } catch (error) {
      console.error('❌ Image preprocessing error:', error);
      throw error;
    }
  }

  async analyzeTireImage(imageBuffer) {
    const results = {};

    try {
      const preprocessedImage = await this.preprocessImage(imageBuffer);

      // Tread depth prediction
      if (this.models.treadDepth) {
        const treadPrediction = this.models.treadDepth.predict(preprocessedImage);
        const treadDepth = treadPrediction.dataSync()[0];
        results.treadDepth = {
          value: Math.max(0, Math.min(10, treadDepth)), // Clamp to 0-10mm
          unit: 'mm',
          confidence: 0.85 // Placeholder confidence
        };
        treadPrediction.dispose();
      }

      // Condition classification
      if (this.models.conditionClassifier) {
        const conditionPrediction = this.models.conditionClassifier.predict(preprocessedImage);
        const conditionScores = conditionPrediction.dataSync();
        const conditionLabels = ['excellent', 'good', 'fair', 'poor', 'critical'];
        const maxIndex = conditionScores.indexOf(Math.max(...conditionScores));

        results.condition = {
          label: conditionLabels[maxIndex],
          confidence: conditionScores[maxIndex],
          scores: Object.fromEntries(
            conditionLabels.map((label, i) => [label, conditionScores[i]])
          )
        };
        conditionPrediction.dispose();
      }

      // Clean up preprocessed image
      preprocessedImage.dispose();

      // Add metadata
      results.metadata = {
        analyzedAt: new Date().toISOString(),
        imageSize: imageBuffer.length,
        modelsUsed: Object.keys(this.models)
      };

      return results;

    } catch (error) {
      console.error('❌ Tire analysis error:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.loadModels();

      this.app.listen(this.port, () => {
        console.log(`🚀 ML Model Server running on port ${this.port}`);
        console.log(`📊 Loaded models: ${Object.keys(this.models).join(', ')}`);
        console.log(`🔗 Health check: http://localhost:${this.port}/health`);
        console.log(`🎯 Analysis endpoint: http://localhost:${this.port}/analyze`);
      });

    } catch (error) {
      console.error('❌ Failed to start ML server:', error);
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ML server...');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  const server = new ModelServer();
  server.start();
}

module.exports = ModelServer;
