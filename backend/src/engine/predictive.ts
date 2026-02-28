/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — FORMULAS 20-22
 * PREDICTIVE ANALYTICS MODULE
 */

import { Z_SCORE_95, SMOOTHING_FACTORS } from './constants';

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// FORMULA 20: Exponential Smoothing F_t+1 = α × A_t + (1-α) × F_t
export function exponentialSmoothing(data: number[], stepsAhead: number = 3, alpha?: number) {
    if (data.length < 2) throw new Error('Need at least 2 data points');
    if (alpha === undefined) {
        const diffs = data.slice(1).map((v, i) => Math.abs(v - data[i]));
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const cv = avg > 0 ? (diffs.reduce((a, b) => a + b, 0) / diffs.length) / avg : 0;
        alpha = cv > 0.3 ? SMOOTHING_FACTORS.volatile : SMOOTHING_FACTORS.stable;
    }
    if (alpha <= 0 || alpha >= 1) throw new Error('alpha must be (0, 1)');

    const smoothed: number[] = [data[0]];
    for (let t = 1; t < data.length; t++) {
        smoothed.push(round2(alpha * data[t - 1] + (1 - alpha) * smoothed[t - 1]));
    }
    const mae = round2(data.map((a, i) => Math.abs(a - smoothed[i])).reduce((a, b) => a + b, 0) / data.length);
    const last = round2(alpha * data[data.length - 1] + (1 - alpha) * smoothed[smoothed.length - 1]);
    const forecasts = Array(stepsAhead).fill(last);

    return { forecasts, lastForecast: last, alpha, formula: `F(t+1) = ${alpha} × A(t) + ${round2(1 - alpha)} × F(t)`, mae };
}

// FORMULA 21: Confidence Interval CI = x̄ ± z × (σ/√n)
export function calculateConfidenceInterval(data: number[]) {
    const n = data.length;
    if (n < 3) throw new Error('Need at least 3 data points');
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    const z = n >= 30 ? Z_SCORE_95 : Z_SCORE_95 * (1 + 1 / (4 * n));
    const moe = z * (stdDev / Math.sqrt(n));

    return {
        mean: round2(mean), stdDev: round2(stdDev), marginOfError: round2(moe),
        lower: round2(mean - moe), upper: round2(mean + moe), n,
        confidenceLevel: '95%', isReliable: n >= 30,
        formula: `CI = ${round2(mean)} ± ${round2(z)} × (${round2(stdDev)}/√${n}) = [${round2(mean - moe)}, ${round2(mean + moe)}]`,
    };
}

// FORMULA 22: Linear Regression ŷ = β₀ + β₁x (OLS)
export function linearRegression(yValues: number[], stepsAhead: number = 3) {
    const n = yValues.length;
    if (n < 3) throw new Error('Need at least 3 data points');
    const xMean = (n - 1) / 2;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let sXY = 0, sX2 = 0;
    for (let i = 0; i < n; i++) { sXY += (i - xMean) * (yValues[i] - yMean); sX2 += (i - xMean) ** 2; }
    const b1 = sX2 !== 0 ? sXY / sX2 : 0;
    const b0 = yMean - b1 * xMean;

    let ssRes = 0, ssTot = 0;
    const residuals = yValues.map((y, i) => { const r = y - (b0 + b1 * i); ssRes += r * r; ssTot += (y - yMean) ** 2; return round2(r); });
    const r2 = ssTot !== 0 ? round2(1 - ssRes / ssTot) : 0;
    const predictions = Array.from({ length: stepsAhead }, (_, s) => round2(Math.max(0, b0 + b1 * (n + s))));
    const trend = b1 < -yMean * 0.02 ? 'improving' as const : b1 > yMean * 0.02 ? 'worsening' as const : 'stable' as const;

    return { beta0: round2(b0), beta1: round2(b1), rSquared: r2, predictions, residuals, formula: `ŷ = ${round2(b0)} + ${round2(b1)}x (R²=${r2})`, isReliable: r2 > 0.5, trendDirection: trend };
}
