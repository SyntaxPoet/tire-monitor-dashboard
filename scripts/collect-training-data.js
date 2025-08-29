#!/usr/bin/env node

/**
 * Data Collection Script for Tire ML Training
 *
 * Collects tire images and metadata for model training
 * Supports multiple data sources and formats
 */

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class DataCollector {
  constructor() {
    this.rawDataDir = path.join(__dirname, '..', 'data', 'raw');
    this.processedDataDir = path.join(__dirname, '..', 'data', 'labeled');
    this.batchSize = 100;
  }

  async collectFromDatabase() {
    console.log('🔍 Collecting data from existing database...');

    try {
      // Get all tire photos with measurements
      const photos = await prisma.tirePhoto.findMany({
        include: {
          tire: {
            include: {
              vehicle: true,
              measurements: true
            }
          },
          measurements: true
        }
      });

      console.log(`📸 Found ${photos.length} photos in database`);

      for (const photo of photos) {
        await this.processDatabasePhoto(photo);
      }

      console.log('✅ Database data collection complete');
    } catch (error) {
      console.error('❌ Database collection error:', error);
    }
  }

  async processDatabasePhoto(photo) {
    try {
      // Create training data structure
      const trainingData = {
        id: photo.id,
        tireId: photo.tireId,
        imagePath: photo.filePath,
        imageName: photo.fileName,
        takenAt: photo.takenAt,
        vehicleInfo: {
          make: photo.tire.vehicle.make,
          model: photo.tire.vehicle.model,
          year: photo.tire.vehicle.year
        },
        tireInfo: {
          position: photo.tire.position,
          size: photo.tire.size,
          brand: photo.tire.brand
        },
        measurements: photo.measurements.map(m => ({
          type: m.type,
          value: m.value,
          unit: m.unit,
          confidence: m.confidence
        })),
        labels: this.extractLabels(photo.measurements)
      };

      // Save to training data directory
      const outputPath = path.join(this.processedDataDir, `${photo.id}.json`);
      await fs.writeFile(outputPath, JSON.stringify(trainingData, null, 2));

      console.log(`💾 Processed photo: ${photo.id}`);

    } catch (error) {
      console.error(`❌ Error processing photo ${photo.id}:`, error);
    }
  }

  extractLabels(measurements) {
    // Extract training labels from measurements
    const labels = {};

    measurements.forEach(measurement => {
      switch (measurement.type) {
        case 'TREAD_DEPTH':
          labels.treadDepth = measurement.value;
          break;
        case 'SIDEWALL_CONDITION':
          labels.sidewallCondition = measurement.value;
          break;
        case 'WEAR_PATTERN':
          labels.wearPattern = measurement.value;
          break;
      }
    });

    return labels;
  }

  async collectSyntheticData() {
    console.log('🎨 Generating synthetic training data...');

    // Generate synthetic tire data for training
    const syntheticData = [];

    for (let i = 0; i < 1000; i++) {
      const data = this.generateSyntheticTireData();
      syntheticData.push(data);

      // Save in batches
      if (i % this.batchSize === 0) {
        await this.saveSyntheticBatch(syntheticData.splice(0));
      }
    }

    console.log('✅ Synthetic data generation complete');
  }

  generateSyntheticTireData() {
    // Generate realistic synthetic tire data
    const conditions = ['excellent', 'good', 'fair', 'poor', 'critical'];
    const wearPatterns = ['uniform', 'inner', 'outer', 'random'];

    return {
      id: `synthetic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synthetic: true,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      wearPattern: wearPatterns[Math.floor(Math.random() * wearPatterns.length)],
      treadDepth: Math.random() * 10, // 0-10mm
      sidewallCondition: Math.random() * 100, // 0-100%
      pressure: 25 + Math.random() * 15, // 25-40 PSI
      temperature: 15 + Math.random() * 30, // 15-45°C
      mileage: Math.random() * 50000, // 0-50k miles
      features: {
        hasCracks: Math.random() > 0.8,
        hasBulges: Math.random() > 0.9,
        treadWear: Math.random(),
        sidewallDamage: Math.random()
      }
    };
  }

  async saveSyntheticBatch(batch) {
    const batchId = Date.now();
    const outputPath = path.join(this.rawDataDir, `synthetic_batch_${batchId}.json`);

    await fs.writeFile(outputPath, JSON.stringify({
      batchId,
      timestamp: new Date().toISOString(),
      data: batch
    }, null, 2));

    console.log(`💾 Saved synthetic batch: ${batchId} (${batch.length} items)`);
  }

  async collectPublicDatasets() {
    console.log('🌐 Collecting public tire datasets...');

    // Placeholder for public dataset integration
    // Could integrate with datasets like:
    // - Tire texture datasets
    // - Vehicle maintenance datasets
    // - Computer vision tire datasets

    console.log('ℹ️  Public dataset collection not yet implemented');
    console.log('   Consider integrating with tire-specific datasets');
  }

  async run() {
    console.log('🚀 Starting data collection pipeline...\n');

    try {
      // Ensure directories exist
      await fs.mkdir(this.rawDataDir, { recursive: true });
      await fs.mkdir(this.processedDataDir, { recursive: true });

      // Run all collection methods
      await this.collectFromDatabase();
      await this.collectSyntheticData();
      await this.collectPublicDatasets();

      console.log('\n✅ Data collection pipeline complete!');
      console.log(`📊 Check ${this.rawDataDir} and ${this.processedDataDir} for collected data`);

    } catch (error) {
      console.error('❌ Data collection failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const collector = new DataCollector();
  collector.run();
}

module.exports = DataCollector;
