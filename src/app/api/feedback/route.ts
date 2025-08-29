/**
 * User Feedback API Route
 *
 * Handles user feedback on ML analysis results
 * Updates training data with user corrections
 */

import { NextRequest, NextResponse } from 'next/server';
import { continuousLearning } from '@/lib/ml/continuous-learning';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tireId, sampleId, userRating, corrections } = body;

    if (!tireId || !sampleId || userRating === undefined) {
      return NextResponse.json(
        { error: 'tireId, sampleId, and userRating are required' },
        { status: 400 }
      );
    }

    if (userRating < 1 || userRating > 5) {
      return NextResponse.json(
        { error: 'userRating must be between 1 and 5' },
        { status: 400 }
      );
    }

    console.log('📝 Processing user feedback:', {
      tireId,
      sampleId,
      userRating,
      hasCorrections: !!corrections
    });

    // Process the feedback through continuous learning system
    await continuousLearning.onUserFeedback(tireId, sampleId, userRating, corrections);

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      data: {
        tireId,
        sampleId,
        userRating,
        correctionsProvided: !!corrections
      }
    });

  } catch (error) {
    console.error('❌ Feedback API Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('📊 Fetching continuous learning stats...');

    const stats = await continuousLearning.getLearningStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Learning stats API Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch learning stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
