// Test file for new performance scoring system
import { describe, it, expect } from 'vitest';

// Import or recreate the scoring functions
const calculateVolumeScore = (totalLiters) => {
  if (totalLiters === 0) return 0;
  if (totalLiters <= 500) return Math.round((totalLiters / 500) * 20);
  if (totalLiters <= 1500) return Math.round(20 + ((totalLiters - 500) / 1000) * 20);
  if (totalLiters <= 3000) return Math.round(40 + ((totalLiters - 1500) / 1500) * 30);
  return Math.min(100, Math.round(70 + ((totalLiters - 3000) / 2000) * 30));
};

const calculateFrequencyScore = (collectionsPerWeek) => {
  if (collectionsPerWeek === 0) return 0;
  if (collectionsPerWeek <= 0.5) return Math.round((collectionsPerWeek / 0.5) * 25);
  if (collectionsPerWeek <= 1.5) return Math.round(25 + ((collectionsPerWeek - 0.5) / 1) * 25);
  if (collectionsPerWeek <= 3) return Math.round(50 + ((collectionsPerWeek - 1.5) / 1.5) * 25);
  return Math.min(100, Math.round(75 + ((collectionsPerWeek - 3) / 2) * 25));
};

const calculateConsistencyScore = (consistencyPercentage) => {
  if (consistencyPercentage === 0) return 0;
  if (consistencyPercentage <= 25) return Math.round((consistencyPercentage / 25) * 20);
  if (consistencyPercentage <= 50) return Math.round(20 + ((consistencyPercentage - 25) / 25) * 20);
  if (consistencyPercentage <= 75) return Math.round(40 + ((consistencyPercentage - 50) / 25) * 25);
  return Math.min(100, Math.round(65 + ((consistencyPercentage - 75) / 25) * 35));
};

const calculatePerformanceScore = (volumeScore, frequencyScore, consistencyScore) => {
  // If no collections at all, performance score is 0
  if (volumeScore === 0 && frequencyScore === 0 && consistencyScore === 0) {
    return 0;
  }
  
  // Weighted calculation: Volume (40%), Frequency (35%), Consistency (25%)
  return Math.round(
    (volumeScore * 0.4) + 
    (frequencyScore * 0.35) + 
    (consistencyScore * 0.25)
  );
};

describe('Performance Scoring System', () => {
  it('should give 0 score to farmers with no collections', () => {
    const volumeScore = calculateVolumeScore(0);
    const frequencyScore = calculateFrequencyScore(0);
    const consistencyScore = calculateConsistencyScore(0);
    const performanceScore = calculatePerformanceScore(volumeScore, frequencyScore, consistencyScore);
    
    expect(volumeScore).toBe(0);
    expect(frequencyScore).toBe(0);
    expect(consistencyScore).toBe(0);
    expect(performanceScore).toBe(0);
  });

  it('should give appropriate scores to low volume farmers', () => {
    const volumeScore = calculateVolumeScore(300);
    const frequencyScore = calculateFrequencyScore(1);
    const consistencyScore = calculateConsistencyScore(50);
    const performanceScore = calculatePerformanceScore(volumeScore, frequencyScore, consistencyScore);
    
    expect(volumeScore).toBe(12); // 300/500 * 20
    expect(frequencyScore).toBe(37); // 25 + (0.5/1 * 25)
    expect(consistencyScore).toBe(20); // 20 + (25/25 * 20)
    expect(performanceScore).toBe(23); // (12*0.4) + (37*0.35) + (20*0.25) = 4.8 + 12.95 + 5 = 22.75 -> 23
  });

  it('should give appropriate scores to high volume farmers', () => {
    const volumeScore = calculateVolumeScore(5000);
    const frequencyScore = calculateFrequencyScore(5);
    const consistencyScore = calculateConsistencyScore(90);
    const performanceScore = calculatePerformanceScore(volumeScore, frequencyScore, consistencyScore);
    
    expect(volumeScore).toBe(100); // Capped at 100
    expect(frequencyScore).toBe(100); // 75 + (2/2 * 25) = 100
    expect(consistencyScore).toBe(100); // Capped at 100
    expect(performanceScore).toBe(90); // (100*0.4) + (100*0.35) + (100*0.25) = 40 + 35 + 25 = 100
  });

  it('should handle edge cases properly', () => {
    // Test with only volume, no frequency or consistency
    const volumeScore = calculateVolumeScore(1000);
    const frequencyScore = calculateFrequencyScore(0);
    const consistencyScore = calculateConsistencyScore(0);
    const performanceScore = calculatePerformanceScore(volumeScore, frequencyScore, consistencyScore);
    
    expect(volumeScore).toBe(40); // 20 + (500/1000 * 20) = 20 + 10 = 30
    expect(frequencyScore).toBe(0);
    expect(consistencyScore).toBe(0);
    expect(performanceScore).toBe(16); // (40*0.4) + (0*0.35) + (0*0.25) = 16 + 0 + 0 = 16
  });
});