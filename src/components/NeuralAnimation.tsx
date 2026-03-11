import React from 'react';

// Positions for each layer of nodes
const LAYERS = [
    // Input layer (3 nodes)
    [{ x: 60, y: 80 }, { x: 60, y: 160 }, { x: 60, y: 240 }],
    // Hidden layer 1 (4 nodes)
    [{ x: 170, y: 55 }, { x: 170, y: 120 }, { x: 170, y: 185 }, { x: 170, y: 250 }],
    // Hidden layer 2 (4 nodes)
    [{ x: 280, y: 55 }, { x: 280, y: 120 }, { x: 280, y: 185 }, { x: 280, y: 250 }],
    // Output layer (3 nodes)
    [{ x: 390, y: 80 }, { x: 390, y: 160 }, { x: 390, y: 240 }],
];

const COLORS = ['#dc2626', '#ec4899', '#8b5cf6', '#3b82f6'];

interface Pulse {
    id: string;
    fromLayer: number;
    fromNode: number;
    toLayer: number;
    toNode: number;
    delay: number;
    color: string;
}

// Pre-generate a set of animated pulses across the network
const PULSES: Pulse[] = (() => {
    const pulses: Pulse[] = [];
    let id = 0;
    for (let l = 0; l < LAYERS.length - 1; l++) {
        LAYERS[l].forEach((_, ni) => {
            LAYERS[l + 1].forEach((_, nj) => {
                if (Math.random() > 0.4) {
                    pulses.push({
                        id: `p${id++}`,
                        fromLayer: l,
                        fromNode: ni,
                        toLayer: l + 1,
                        toNode: nj,
                        delay: Math.random() * 3,
                        color: COLORS[l],
                    });
                }
            });
        });
    }
    return pulses;
})();

export default function NeuralAnimation({ isDark }: { isDark: boolean }) {
    const nodeFill = isDark ? '#1e293b' : '#f8fafc';
    const nodeStroke = isDark ? '#334155' : '#e2e8f0';
    const edgeStroke = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

    return (
        <div className="flex flex-col items-center justify-center py-10 space-y-6" aria-label="AI processing animation">
            <div className="relative">
                <svg
                    viewBox="0 0 450 310"
                    width="100%"
                    height="auto"
                    style={{ maxWidth: 420 }}
                    role="img"
                    aria-label="Neural network visualization"
                >
                    {/* Background edges */}
                    {LAYERS.slice(0, -1).map((layer, li) =>
                        layer.map((from, ni) =>
                            LAYERS[li + 1].map((to, nj) => (
                                <line
                                    key={`e${li}-${ni}-${nj}`}
                                    x1={from.x} y1={from.y}
                                    x2={to.x} y2={to.y}
                                    stroke={edgeStroke}
                                    strokeWidth="1"
                                />
                            ))
                        )
                    )}

                    {/* Animated pulses moving along edges */}
                    {PULSES.map(pulse => {
                        const from = LAYERS[pulse.fromLayer][pulse.fromNode];
                        const to = LAYERS[pulse.toLayer][pulse.toNode];
                        return (
                            <circle key={pulse.id} r="3" fill={pulse.color} opacity="0.9">
                                <animateMotion
                                    dur="1.8s"
                                    repeatCount="indefinite"
                                    begin={`${pulse.delay.toFixed(2)}s`}
                                >
                                    <mpath>
                                        <animate
                                            attributeName="d"
                                            from={`M${from.x},${from.y} L${to.x},${to.y}`}
                                            to={`M${from.x},${from.y} L${to.x},${to.y}`}
                                        />
                                    </mpath>
                                    <animate
                                        attributeName="cx"
                                        values={`${from.x};${to.x}`}
                                        dur="1.8s"
                                        repeatCount="indefinite"
                                        begin={`${pulse.delay.toFixed(2)}s`}
                                    />
                                    <animate
                                        attributeName="cy"
                                        values={`${from.y};${to.y}`}
                                        dur="1.8s"
                                        repeatCount="indefinite"
                                        begin={`${pulse.delay.toFixed(2)}s`}
                                    />
                                </animateMotion>
                            </circle>
                        );
                    })}

                    {/* Animated pulses (cx/cy approach for broad SVG support) */}
                    {PULSES.map(pulse => {
                        const from = LAYERS[pulse.fromLayer][pulse.fromNode];
                        const to = LAYERS[pulse.toLayer][pulse.toNode];
                        return (
                            <circle key={`dot-${pulse.id}`} r="3" fill={pulse.color} opacity="0">
                                <animate attributeName="cx" values={`${from.x};${to.x}`} dur="1.8s" repeatCount="indefinite" begin={`${pulse.delay.toFixed(2)}s`} />
                                <animate attributeName="cy" values={`${from.y};${to.y}`} dur="1.8s" repeatCount="indefinite" begin={`${pulse.delay.toFixed(2)}s`} />
                                <animate attributeName="opacity" values="0;0.9;0" dur="1.8s" repeatCount="indefinite" begin={`${pulse.delay.toFixed(2)}s`} />
                            </circle>
                        );
                    })}

                    {/* Nodes */}
                    {LAYERS.map((layer, li) =>
                        layer.map((node, ni) => {
                            const color = COLORS[Math.min(li, COLORS.length - 1)];
                            const delay = (li * 0.25 + ni * 0.1).toFixed(2);
                            return (
                                <g key={`n${li}-${ni}`}>
                                    {/* Glow ring */}
                                    <circle cx={node.x} cy={node.y} r="16" fill={color} opacity="0.08">
                                        <animate attributeName="r" values="14;20;14" dur="2.5s" repeatCount="indefinite" begin={`${delay}s`} />
                                        <animate attributeName="opacity" values="0.06;0.14;0.06" dur="2.5s" repeatCount="indefinite" begin={`${delay}s`} />
                                    </circle>
                                    {/* Main node */}
                                    <circle cx={node.x} cy={node.y} r="12" fill={nodeFill} stroke={color} strokeWidth="2">
                                        <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" begin={`${delay}s`} />
                                    </circle>
                                    {/* Inner dot */}
                                    <circle cx={node.x} cy={node.y} r="4" fill={color}>
                                        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" begin={`${delay}s`} />
                                    </circle>
                                </g>
                            );
                        })
                    )}

                    {/* Layer labels */}
                    {['Input', 'Hidden', 'Hidden', 'Output'].map((label, li) => (
                        <text
                            key={`label-${li}`}
                            x={LAYERS[li][0].x}
                            y={290}
                            textAnchor="middle"
                            fontSize="10"
                            fill={isDark ? '#64748b' : '#94a3b8'}
                            fontFamily="monospace"
                        >
                            {label}
                        </text>
                    ))}
                </svg>
            </div>

            <div className="text-center space-y-1.5">
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    AI is generating your ideas
                </p>
                <div className="flex items-center justify-center gap-1.5">
                    {[0, 200, 400].map(d => (
                        <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"
                            style={{ animationDelay: `${d}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
