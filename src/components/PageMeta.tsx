import { useEffect } from 'react';

interface PageMetaProps {
    title: string;
    description: string;
}

/**
 * Sets document <title> and <meta name="description"> per-page.
 * Appends "— Catch My Project" to every title for brand consistency.
 */
export default function PageMeta({ title, description }: PageMetaProps) {
    useEffect(() => {
        const prev = document.title;
        document.title = `${title} — Catch My Project`;

        let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const prevDesc = meta?.getAttribute('content') ?? '';
        if (meta) meta.setAttribute('content', description);

        return () => {
            document.title = prev;
            if (meta) meta.setAttribute('content', prevDesc);
        };
    }, [title, description]);

    return null;
}
