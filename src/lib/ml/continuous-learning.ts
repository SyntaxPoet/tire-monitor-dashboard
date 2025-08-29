/**
 * Continuous Learning System
 *
 * Automatically captures user interactions and photos for ML training
 * Creates a feedback loop where the app gets smarter over time
 */

import { prisma } from '@/lib/db';
import { mlService } from './ml-service';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export interface TrainingSample {
  id: string;
  imagePath: string;
  tireId: string;
  vehicleId: string;
  userRating?: number; // 1-5 scale from user feedback
  expertValidation?: boolean;
  labels: {
    treadDepth?: number;
    condition?: string;
    wearPattern?: string;
    confidence?: number;
  };
  metadata: {
    capturedAt: string;
    deviceInfo?: any;
    lighting?: string;
    angle?: string;
    userId?: string;
  };
}

export class ContinuousLearningSystem {
  private trainingDataDir = path.join(process.cwd(), 'data', 'continuous-learning');
  private minSamplesForRetrain = 50;
  private retrainInterval = 24 * 60 * 60 * 1000; // 24 hours
  private lastRetrain = 0;

  async initialize() {
    console.log('🧠 Initializing Continuous Learning System...');

    // Ensure directories exist
    await fs.mkdir(this.trainingDataDir, { recursive: true });
    await fs.mkdir(path.join(this.trainingDataDir, 'images'), { recursive: true });
    await fs.mkdir(path.join(this.trainingDataDir, 'labels'), { recursive: true });

    console.log('✅ Continuous Learning System ready');
  }

  /**
   * Called whenever a user takes a tire photo
   * Automatically saves it for ML training
   */
  async onPhotoCaptured(tireId: string, imageFile: File, userContext?: any) {
    try {
      console.log('📸 Processing photo for continuous learning...');

      // Generate unique ID for this training sample
      const sampleId = `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Save original image
      const imageBuffer = await imageFile.arrayBuffer();
      const imagePath = path.join(this.trainingDataDir, 'images', `${sampleId}.jpg`);

      // Process and save image (resize for consistent training)
      await sharp(Buffer.from(imageBuffer))
        .resize(224, 224, { fit: 'cover' })
        .jpeg({ quality: 95 })
        .toFile(imagePath);

      // Get tire and vehicle info
      const tire = await prisma.tire.findUnique({
        where: { id: tireId },
        include: { vehicle: true }
      });

      if (!tire) {
        console.error('❌ Tire not found for continuous learning');
        return;
      }

      // Analyze the image immediately (if ML service is available)
      let analysisResult;
      try {
        analysisResult = await mlService.analyzeTireImage(imageFile);
      } catch (error) {
        console.log('⚠️  ML analysis failed, using fallback');
        analysisResult = null;
      }

      // Create training sample
      const trainingSample: TrainingSample = {
        id: sampleId,
        imagePath,
        tireId,
        vehicleId: tire.vehicleId,
        labels: analysisResult ? {
          treadDepth: analysisResult.treadDepth.value,
          condition: analysisResult.condition.label,
          wearPattern: analysisResult.wearPattern.pattern,
          confidence: analysisResult.condition.confidence
        } : {},
        metadata: {
          capturedAt: new Date().toISOString(),
          deviceInfo: userContext?.deviceInfo,
          lighting: userContext?.lighting || 'unknown',
          angle: userContext?.angle || 'unknown',
          userId: userContext?.userId
        }
      };

      // Save training sample metadata
      const labelPath = path.join(this.trainingDataDir, 'labels', `${sampleId}.json`);
      await fs.writeFile(labelPath, JSON.stringify(trainingSample, null, 2));

      // Update tire with analysis results if available
      if (analysisResult) {
        await this.saveAnalysisResults(tireId, analysisResult, sampleId);
      }

      console.log(`✅ Training sample saved: ${sampleId}`);

      // Check if we should trigger retraining
      await this.checkRetrainingTrigger();

      return trainingSample;

    } catch (error) {
      console.error('❌ Continuous learning capture failed:', error);
      throw error;
    }
  }

  /**
   * Called when user provides feedback on analysis results
   */
  async onUserFeedback(tireId: string, sampleId: string, userRating: number, corrections?: any) {
    try {
      console.log('📝 Processing user feedback...');

      const labelPath = path.join(this.trainingDataDir, 'labels', `${sampleId}.json`);

      // Load existing sample
      const sampleData = JSON.parse(await fs.readFile(labelPath, 'utf8'));

      // Update with user feedback
      sampleData.userRating = userRating;
      sampleData.userCorrections = corrections;
      sampleData.feedbackProvidedAt = new Date().toISOString();

      // If user provided corrections, update labels
      if (corrections) {
        if (corrections.actualTreadDepth) {
          sampleData.labels.treadDepth = corrections.actualTreadDepth;
          sampleData.expertValidation = true;
        }
        if (corrections.actualCondition) {
          sampleData.labels.condition = corrections.actualCondition;
          sampleData.expertValidation = true;
        }
      }

      // Save updated sample
      await fs.writeFile(labelPath, JSON.stringify(sampleData, null, 2));

      console.log(`✅ User feedback saved for sample: ${sampleId}`);

      // High-confidence feedback triggers immediate retraining consideration
      if (userRating >= 4 || corrections) {
        await this.checkRetrainingTrigger(true); // Force check
      }

    } catch (error) {
      console.error('❌ User feedback processing failed:', error);
    }
  }

  private async saveAnalysisResults(tireId: string, analysis: any, sampleId: string) {
    try {
      // Save measurement results to database
      await prisma.measurement.createMany({
        data: [
          {
            tireId,
            type: 'TREAD_DEPTH',
            value: analysis.treadDepth.value,
            unit: analysis.treadDepth.unit,
            confidence: analysis.treadDepth.confidence,
            notes: `ML analysis - Sample: ${sampleId}`
          },
          {
            tireId,
            type: 'CONDITION',
            value: this.conditionToNumeric(analysis.condition.label),
            unit: 'score',
            confidence: analysis.condition.confidence,
            notes: `ML analysis - Sample: ${sampleId}`
          }
        ]
      });

      console.log('💾 Analysis results saved to database');

    } catch (error) {
      console.error('❌ Failed to save analysis results:', error);
    }
  }

  private conditionToNumeric(condition: string): number {
    const mapping: Record<string, number> = {
      'excellent': 5,
      'good': 4,
      'fair': 3,
      'poor': 2,
      'critical': 1
    };
    return mapping[condition] || 3;
  }

  private async checkRetrainingTrigger(forceCheck = false) {
    try {
      const now = Date.now();

      // Check if enough time has passed or if forced
      if (!forceCheck && (now - this.lastRetrain) < this.retrainInterval) {
        return;
      }

      // Count available training samples
      const labelFiles = await fs.readdir(path.join(this.trainingDataDir, 'labels'));
      const sampleCount = labelFiles.filter(f => f.endsWith('.json')).length;

      if (sampleCount >= this.minSamplesForRetrain) {
        console.log(`🎯 Triggering model retraining (${sampleCount} samples available)`);
        await this.triggerRetraining();
        this.lastRetrain = now;
      } else {
        console.log(`📊 Need ${this.minSamplesForRetrain - sampleCount} more samples for retraining`);
      }

    } catch (error) {
      console.error('❌ Retraining trigger check failed:', error);
    }
  }

  private async triggerRetraining() {
    try {
      console.log('🚀 Starting automated model retraining...');

      // This would typically call your training scripts
      // For now, we'll log the intent and create a retraining job

      const retrainingJob = {
        jobId: `retrain_${Date.now()}`,
        triggeredAt: new Date().toISOString(),
        status: 'scheduled',
        trainingDataPath: this.trainingDataDir,
        expectedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
      };

      // Save retraining job info
      const jobPath = path.join(this.trainingDataDir, 'retraining-jobs', `${retrainingJob.jobId}.json`);
      await fs.mkdir(path.dirname(jobPath), { recursive: true });
      await fs.writeFile(jobPath, JSON.stringify(retrainingJob, null, 2));

      console.log(`📋 Retraining job created: ${retrainingJob.jobId}`);

      // In a production system, you would:
      // 1. Queue the job in a job queue system (Redis, Bull, etc.)
      // 2. Run the training in a separate process/worker
      // 3. Monitor progress and update job status
      // 4. Deploy new models when training completes

    } catch (error) {
      console.error('❌ Retraining trigger failed:', error);
    }
  }

  async getLearningStats() {
    try {
      const labelFiles = await fs.readdir(path.join(this.trainingDataDir, 'labels'));
      const imageFiles = await fs.readdir(path.join(this.trainingDataDir, 'images'));

      const samples = labelFiles.filter(f => f.endsWith('.json'));
      const images = imageFiles.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));

      let totalUserRatings = 0;
      let expertValidations = 0;
      let avgUserRating = 0;

      for (const sampleFile of samples) {
        const samplePath = path.join(this.trainingDataDir, 'labels', sampleFile);
        const sample = JSON.parse(await fs.readFile(samplePath, 'utf8'));

        if (sample.userRating) {
          totalUserRatings++;
          avgUserRating += sample.userRating;
        }

        if (sample.expertValidation) {
          expertValidations++;
        }
      }

      if (totalUserRatings > 0) {
        avgUserRating /= totalUserRatings;
      }

      return {
        totalSamples: samples.length,
        totalImages: images.length,
        userFeedbackCount: totalUserRatings,
        expertValidations,
        averageUserRating: avgUserRating,
        lastRetraining: new Date(this.lastRetrain).toISOString(),
        nextRetraining: new Date(this.lastRetrain + this.retrainInterval).toISOString(),
        samplesUntilRetrain: Math.max(0, this.minSamplesForRetrain - samples.length)
      };

    } catch (error) {
      console.error('❌ Failed to get learning stats:', error);
      return {
        totalSamples: 0,
        totalImages: 0,
        userFeedbackCount: 0,
        expertValidations: 0,
        averageUserRating: 0,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const continuousLearning = new ContinuousLearningSystem();
export default continuousLearning;
