'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, Users, Target, Clock, Star } from 'lucide-react';

interface LearningStats {
  totalSamples: number;
  totalImages: number;
  userFeedbackCount: number;
  expertValidations: number;
  averageUserRating: number;
  lastRetraining: string;
  nextRetraining: string;
  samplesUntilRetrain: number;
  error?: string;
}

export function ContinuousLearningStats() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearningStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchLearningStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLearningStats = async () => {
    try {
      const response = await fetch('/api/feedback');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('Failed to fetch learning stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching learning stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load learning statistics</p>
        </CardContent>
      </Card>
    );
  }

  const retrainingProgress = Math.max(0, ((50 - stats.samplesUntilRetrain) / 50) * 100);
  const timeUntilRetrain = new Date(stats.nextRetraining).getTime() - Date.now();
  const hoursUntilRetrain = Math.max(0, Math.floor(timeUntilRetrain / (1000 * 60 * 60)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Data Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Training Samples</span>
              <span className={`text-xs px-2 py-1 rounded-full ${stats.totalSamples > 10 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {stats.totalSamples}/50 needed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${retrainingProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              {stats.samplesUntilRetrain > 0
                ? `${stats.samplesUntilRetrain} more samples until next retraining`
                : 'Ready for retraining! 🎯'
              }
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats.totalSamples}</p>
                <p className="text-xs text-muted-foreground">Training Samples</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats.userFeedbackCount}</p>
                <p className="text-xs text-muted-foreground">User Ratings</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-full">
                <Star className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {stats.averageUserRating > 0 ? stats.averageUserRating.toFixed(1) : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats.expertValidations}</p>
                <p className="text-xs text-muted-foreground">Expert Reviews</p>
              </div>
            </div>
          </div>

          {/* Retraining Status */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">Next Retraining</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${hoursUntilRetrain < 6 ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}>
                {hoursUntilRetrain > 24
                  ? `${Math.floor(hoursUntilRetrain / 24)} days`
                  : `${hoursUntilRetrain}h`
                }
              </span>
            </div>

            <p className="text-xs text-gray-600 mt-1">
              Models automatically improve with your tire photos and feedback
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Photo Capture</p>
                <p className="text-xs text-muted-foreground">
                  Every tire photo you take is automatically saved for AI training
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Analysis & Learning</p>
                <p className="text-xs text-muted-foreground">
                  AI analyzes photos and learns from patterns in your tire data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Continuous Improvement</p>
                <p className="text-xs text-muted-foreground">
                  Models retrain automatically with new data, getting smarter over time
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                4
              </div>
              <div>
                <p className="text-sm font-medium">Feedback Loop</p>
                <p className="text-xs text-muted-foreground">
                  Your ratings and corrections help the AI learn what matters most
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
