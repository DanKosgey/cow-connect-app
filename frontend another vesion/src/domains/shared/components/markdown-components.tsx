import { Components } from 'react-markdown'

export const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="text-current mb-4">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mb-4 text-current">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mb-3 text-current">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold mb-2 text-current">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-4 text-current">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-4 text-current">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="mb-1 text-current">{children}</li>
  ),
  code: ({ inline, children }) => (
    inline 
      ? <code className="bg-black/20 rounded px-1 py-0.5 text-sm">{children}</code>
      : <pre className="bg-black/20 rounded p-3 mb-4 overflow-x-auto">
          <code className="text-sm">{children}</code>
        </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-current pl-4 italic mb-4">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};
