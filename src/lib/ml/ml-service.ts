/**
 * ML Service for Tire Analysis
 *
 * Integrates TensorFlow.js models with the Next.js application
 * Provides real-time tire analysis capabilities
 */

import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';

export interface TireAnalysisResult {
  treadDepth: {
    value: number;
    unit: string;
    confidence: number;
  };
  condition: {
    label: string;
    confidence: number;
    scores: Record<string, number>;
  };
  wearPattern: {
    pattern: string;
    confidence: number;
    severity: string;
  };
  metadata: {
    analyzedAt: string;
    imageSize: number;
    processingTime: number;
  };
}

export interface TirePhoto {
  id: string;
  tireId: string;
  filePath: string;
  fileName: string;
  takenAt: string;
}

class MLService {
  private models: Map<string, tf.LayersModel> = new Map();
  private isInitialized = false;
  private mlServerUrl = process.env.ML_SERVER_URL || 'http://localhost:3001';

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing ML Service...');

      // Load models from local storage or ML server
      await this.loadModels();

      this.isInitialized = true;
      console.log('✅ ML Service initialized successfully');

    } catch (error) {
      console.error('❌ ML Service initialization failed:', error);
      // Continue without ML capabilities
      this.isInitialized = false;
    }
  }

  private async loadModels() {
    try {
      // Try to load models from ML server first
      const response = await fetch(`${this.mlServerUrl}/models`);
      if (response.ok) {
        const modelInfo = await response.json();
        console.log('🔗 Connected to ML server:', Object.keys(modelInfo));
        return;
      }
    } catch (error) {
      console.log('⚠️  ML server not available, using local fallback');
    }

    // Fallback: Try to load models from local storage
    // Note: In production, models would be served from the ML server
    console.log('📦 Using local model loading (for development)');
  }

  async analyzeTireImage(imageFile: File, tireInfo?: any): Promise<TireAnalysisResult> {
    await this.initialize();

    const startTime = Date.now();

    try {
      console.log('🔍 Analyzing tire image...');

      // Prepare image for analysis
      const imageBuffer = await this.preprocessImage(imageFile);

      // Use ML server for analysis if available
      if (this.isInitialized && await this.isMLServerAvailable()) {
        return await this.analyzeWithServer(imageBuffer, tireInfo);
      }

      // Fallback to mock analysis for development
      return await this.mockAnalysis(imageBuffer, tireInfo);

    } catch (error) {
      console.error('❌ Tire analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      const processingTime = Date.now() - startTime;
      console.log(`⏱️  Analysis completed in ${processingTime}ms`);
    }
  }

  private async preprocessImage(imageFile: File): Promise<Buffer> {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize and optimize image using Sharp
    const processedBuffer = await sharp(buffer)
      .resize(224, 224, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    return processedBuffer;
  }

  private async isMLServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.mlServerUrl}/health`, {
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async analyzeWithServer(imageBuffer: Buffer, tireInfo?: any): Promise<TireAnalysisResult> {
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', imageBlob);

    if (tireInfo) {
      formData.append('tireInfo', JSON.stringify(tireInfo));
    }

    const response = await fetch(`${this.mlServerUrl}/analyze`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`ML server error: ${response.status}`);
    }

    const result = await response.json();

    return {
      treadDepth: result.analysis.treadDepth,
      condition: result.analysis.condition,
      wearPattern: result.analysis.wearPattern || this.generateWearPattern(),
      metadata: {
        analyzedAt: result.analysis.metadata?.analyzedAt || new Date().toISOString(),
        imageSize: imageBuffer.length,
        processingTime: result.analysis.metadata?.processingTime || 0
      }
    };
  }

  private async mockAnalysis(imageBuffer: Buffer, tireInfo?: any): Promise<TireAnalysisResult> {
    // Mock analysis for development when ML server is not available
    console.log('🎭 Using mock analysis (ML server not available)');

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockCondition = this.generateMockCondition();
    const mockTreadDepth = this.generateMockTreadDepth();

    return {
      treadDepth: {
        value: mockTreadDepth,
        unit: 'mm',
        confidence: 0.75 + Math.random() * 0.2
      },
      condition: {
        label: mockCondition.label,
        confidence: mockCondition.confidence,
        scores: mockCondition.scores
      },
      wearPattern: this.generateWearPattern(),
      metadata: {
        analyzedAt: new Date().toISOString(),
        imageSize: imageBuffer.length,
        processingTime: 1000
      }
    };
  }

  private generateMockCondition() {
    const conditions = ['excellent', 'good', 'fair', 'poor', 'critical'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

    const scores: Record<string, number> = {};
    conditions.forEach(condition => {
      scores[condition] = condition === randomCondition
        ? 0.6 + Math.random() * 0.3
        : Math.random() * 0.2;
    });

    // Normalize scores
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    Object.keys(scores).forEach(key => {
      scores[key] = scores[key] / total;
    });

    return {
      label: randomCondition,
      confidence: scores[randomCondition],
      scores
    };
  }

  private generateMockTreadDepth(): number {
    // Generate realistic tread depth between 1-10mm
    return Math.round((1 + Math.random() * 9) * 100) / 100;
  }

  private generateWearPattern() {
    const patterns = ['uniform', 'inner', 'outer', 'random'];
    const severities = ['low', 'medium', 'high'];

    return {
      pattern: patterns[Math.floor(Math.random() * patterns.length)],
      confidence: 0.7 + Math.random() * 0.25,
      severity: severities[Math.floor(Math.random() * severities.length)]
    };
  }

  async getModelStatus() {
    try {
      if (await this.isMLServerAvailable()) {
        const response = await fetch(`${this.mlServerUrl}/models`);
        const modelInfo = await response.json();
        return {
          available: true,
          server: this.mlServerUrl,
          models: modelInfo
        };
      }
    } catch (error) {
      // ML server not available
    }

    return {
      available: false,
      server: this.mlServerUrl,
      models: {},
      status: 'ML server not available - using mock analysis'
    };
  }

  async batchAnalyze(images: File[], tireInfos?: any[]): Promise<TireAnalysisResult[]> {
    await this.initialize();

    if (await this.isMLServerAvailable()) {
      return await this.batchAnalyzeWithServer(images, tireInfos);
    }

    // Fallback to individual mock analysis
    const results = [];
    for (let i = 0; i < images.length; i++) {
      const result = await this.mockAnalysis(
        await this.preprocessImage(images[i]),
        tireInfos?.[i]
      );
      results.push(result);
    }

    return results;
  }

  private async batchAnalyzeWithServer(images: File[], tireInfos?: any[]): Promise<TireAnalysisResult[]> {
    const formData = new FormData();

    images.forEach((image, index) => {
      formData.append('images', image);
    });

    if (tireInfos) {
      formData.append('tireInfos', JSON.stringify(tireInfos));
    }

    const response = await fetch(`${this.mlServerUrl}/analyze/batch`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Batch analysis failed: ${response.status}`);
    }

    const result = await response.json();
    return result.results.map((r: any) => r.analysis);
  }
}

// Export singleton instance
export const mlService = new MLService();
export default mlService;
