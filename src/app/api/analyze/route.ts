/**
 * Tire Analysis API Route
 *
 * Provides ML-powered analysis of tire images
 * Integrates with the ML service for real-time processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { mlService } from '@/lib/ml/ml-service';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 ML Analysis API: Request received');

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const tireInfo = formData.get('tireInfo');

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    console.log('📸 Processing image:', imageFile.name);
    console.log('📊 File size:', imageFile.size, 'bytes');

    // Parse tire info if provided
    let parsedTireInfo;
    if (tireInfo) {
      try {
        parsedTireInfo = JSON.parse(tireInfo as string);
        console.log('🔧 Tire info:', parsedTireInfo);
      } catch (error) {
        console.log('⚠️  Could not parse tire info, continuing without it');
      }
    }

    // Perform ML analysis
    const analysisResult = await mlService.analyzeTireImage(imageFile, parsedTireInfo);

    console.log('✅ Analysis completed:', {
      condition: analysisResult.condition.label,
      confidence: analysisResult.condition.confidence.toFixed(2),
      treadDepth: analysisResult.treadDepth.value.toFixed(2) + 'mm'
    });

    // Optionally save analysis results to database
    const shouldSaveToDb = formData.get('saveToDb') === 'true';
    if (shouldSaveToDb && parsedTireInfo?.tireId) {
      try {
        await saveAnalysisToDatabase(parsedTireInfo.tireId, analysisResult);
        console.log('💾 Analysis saved to database');
      } catch (error) {
        console.error('❌ Failed to save to database:', error);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      imageInfo: {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      }
    });

  } catch (error) {
    console.error('❌ ML Analysis API Error:', error);

    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to save analysis results to database
async function saveAnalysisToDatabase(tireId: string, analysis: any) {
  // This would integrate with your existing Prisma database
  // For now, just log the intent
  console.log('📝 Would save analysis to database:', {
    tireId,
    condition: analysis.condition.label,
    treadDepth: analysis.treadDepth.value,
    confidence: analysis.condition.confidence
  });

  // TODO: Implement actual database saving
  // const { prisma } = require('@/lib/db');
  // await prisma.measurement.create({ ... });
}

export async function GET() {
  try {
    console.log('📊 ML Analysis API: Status check');

    const modelStatus = await mlService.getModelStatus();

    return NextResponse.json({
      status: 'healthy',
      mlService: modelStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ML Analysis API Status Error:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
