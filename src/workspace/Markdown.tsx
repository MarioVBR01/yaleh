/**
 * @file Markdown.tsx
 * @description Muestra texto de la IA como markdown, sin HTML crudo (react-markdown
 * no interpreta HTML) y con los enlaces desactivados (brief, sección 5.4).
 */

import ReactMarkdown, { type Components } from 'react-markdown';

const components: Components = {
  // Los enlaces de las respuestas quedan bloqueados en v1: se muestra solo el texto.
  a: ({ children }) => <span className="text-accent-soft">{children}</span>,
  img: () => null,
  h1: ({ children }) => <h3 className="text-ink font-bold text-base mt-3 mb-1">{children}</h3>,
  h2: ({ children }) => <h3 className="text-ink font-bold text-sm mt-3 mb-1">{children}</h3>,
  h3: ({ children }) => <h4 className="text-ink font-semibold text-sm mt-2 mb-1">{children}</h4>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
  strong: ({ children }) => <strong className="text-ink font-semibold">{children}</strong>,
  code: ({ children }) => <code className="px-1 rounded bg-canvas text-accent-soft text-xs">{children}</code>,
  pre: ({ children }) => <pre className="p-2 rounded-lg bg-canvas overflow-x-auto text-xs mb-2">{children}</pre>,
};

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="text-sm text-ink-soft leading-relaxed break-words">
      <ReactMarkdown components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
