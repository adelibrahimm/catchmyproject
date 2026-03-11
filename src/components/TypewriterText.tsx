import React, { useState, useEffect, useRef } from 'react';

interface Props {
    text: string;
    speed?: number; // ms per character
    className?: string;
    onComplete?: () => void;
}

/**
 * Reveals text character-by-character with a blinking cursor.
 * Re-runs whenever `text` prop changes (e.g., new idea arriving).
 */
export default function TypewriterText({ text, speed = 22, className = '', onComplete }: Props) {
    const [displayed, setDisplayed] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setDisplayed('');
        let i = 0;
        intervalRef.current = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
                onComplete?.();
            }
        }, speed);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [text, speed]);

    const isComplete = displayed.length >= text.length;

    return (
        <span className={className}>
            {displayed}
            {!isComplete && (
                <span
                    className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle"
                    style={{ animation: 'blink 0.7s step-end infinite' }}
                    aria-hidden="true"
                />
            )}
            <style>{`
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
        </span>
    );
}
