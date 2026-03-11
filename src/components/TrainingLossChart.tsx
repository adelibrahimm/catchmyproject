/**
 * Training Loss Chart
 *
 * Renders an animated SVG path showing the neural network's
 * Cross-Entropy Loss curve dropping over training epochs.
 *
 * Demonstrates:
 *   - Loss landscape (Lecture 3: Gradient Descent)
 *   - Convergence behaviour of gradient descent
 *   - Final training accuracy
 */

import React, { useEffect, useRef, useState } from 'react';
import { TrainingResult } from '../lib/ml/skillClassifier';

interface Props {
    result: TrainingResult;
    isDark: boolean;
}

const W = 320;
const H = 90;
const PAD = { top: 10, right: 10, bottom: 24, left: 38 };

export default function TrainingLossChart({ result, isDark }: Props) {
    const pathRef = useRef<SVGPathElement>(null);
    const [progress, setProgress] = useState(0); // 0 → 1 draw animation

    const { lossHistory, accuracy, trainTimeMs, datasetSize } = result;

    // Chart bounds
    const maxLoss = Math.max(...lossHistory) * 1.05;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const toX = (i: number) => PAD.left + (i / (lossHistory.length - 1)) * innerW;
    const toY = (v: number) => PAD.top + (1 - v / maxLoss) * innerH;

    // Build SVG path string
    const pathD = lossHistory
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
        .join(' ');

    // Stroke-dashoffset animation on mount
    useEffect(() => {
        const el = pathRef.current;
        if (!el) return;
        const len = el.getTotalLength();
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
        let start: number | null = null;
        const DURATION = 1200; // ms
        function frame(ts: number) {
            if (!start) start = ts;
            const p = Math.min((ts - start) / DURATION, 1);
            el!.style.strokeDashoffset = `${len * (1 - p)}`;
            setProgress(p);
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }, []);

    // Axis labels (loss at max and 0)
    const yTicks = [0, 0.5, 1].map(t => ({
        val: (t * maxLoss).toFixed(2),
        y: toY(t * maxLoss),
    }));

    const epochsTotal = result.epochs;
    const xTicks = [0, 0.5, 1].map(t => ({
        label: Math.round(t * epochsTotal),
        x: toX(t * (lossHistory.length - 1)),
    }));

    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const axisColor = isDark ? '#475569' : '#94a3b8';
    const labelColor = isDark ? '#64748b' : '#94a3b8';
    const strokeColor = isDark ? '#34d399' : '#10b981'; // emerald

    return (
        <div className="space-y-3">
            {/* Stats row */}
            <div className="flex items-center gap-4 flex-wrap">
                <Stat
                    label="Epochs"
                    value={epochsTotal.toString()}
                    isDark={isDark}
                />
                <Stat
                    label="Dataset"
                    value={`${datasetSize} samples`}
                    isDark={isDark}
                />
                <Stat
                    label="Train Time"
                    value={`${trainTimeMs.toFixed(1)} ms`}
                    isDark={isDark}
                />
                <Stat
                    label="Final Loss"
                    value={lossHistory[lossHistory.length - 1].toFixed(4)}
                    isDark={isDark}
                />
                <Stat
                    label="Accuracy"
                    value={`${(accuracy * 100).toFixed(1)}%`}
                    highlight
                    isDark={isDark}
                />
            </div>

            {/* SVG Loss Curve */}
            <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Cross-Entropy Loss vs Epoch
                </div>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
                    {/* Grid lines */}
                    {yTicks.map((t, i) => (
                        <line key={i}
                            x1={PAD.left} y1={t.y}
                            x2={W - PAD.right} y2={t.y}
                            stroke={gridColor} strokeWidth="1"
                        />
                    ))}

                    {/* Y-axis labels */}
                    {yTicks.map((t, i) => (
                        <text key={i}
                            x={PAD.left - 4} y={t.y + 4}
                            fontSize="8" fill={labelColor} textAnchor="end"
                            fontFamily="monospace"
                        >{t.val}</text>
                    ))}

                    {/* X-axis labels */}
                    {xTicks.map((t, i) => (
                        <text key={i}
                            x={t.x} y={H - 6}
                            fontSize="8" fill={labelColor} textAnchor="middle"
                            fontFamily="monospace"
                        >{t.label}</text>
                    ))}

                    {/* Axes */}
                    <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke={axisColor} strokeWidth="1" />
                    <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={axisColor} strokeWidth="1" />

                    {/* Loss fill (area under curve) */}
                    <path
                        d={`${pathD} L ${toX(lossHistory.length - 1).toFixed(1)} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`}
                        fill={isDark ? 'rgba(52,211,153,0.08)' : 'rgba(16,185,129,0.08)'}
                    />

                    {/* Loss line — animated */}
                    <path
                        ref={pathRef}
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Final point dot */}
                    {progress > 0.95 && (
                        <circle
                            cx={toX(lossHistory.length - 1)}
                            cy={toY(lossHistory[lossHistory.length - 1])}
                            r="3.5"
                            fill={strokeColor}
                        />
                    )}
                </svg>
                <div className={`text-[9px] text-center mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    ← Gradient Descent converges as ∂L/∂W → 0 →
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, highlight, isDark }: { label: string; value: string; highlight?: boolean; isDark: boolean }) {
    return (
        <div className={`flex flex-col items-start px-2.5 py-1.5 rounded-lg border ${highlight
                ? isDark ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
            }`}>
            <span className="text-[9px] uppercase tracking-widest opacity-60">{label}</span>
            <span className={`text-xs font-bold font-mono ${highlight ? '' : ''}`}>{value}</span>
        </div>
    );
}
