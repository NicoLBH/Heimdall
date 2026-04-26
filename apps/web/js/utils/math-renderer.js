import { escapeHtml } from './escape-html.js';

function isMathDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem('mdall:debug-markdown-math') === '1';
  } catch {
    return false;
  }
}

function getKatex() {
  return globalThis.katex || null;
}

function logMathWarning(error, latex, displayMode) {
  if (!isMathDebugEnabled()) return;
  console.warn('[markdown-math] KaTeX render warning', {
    message: error instanceof Error ? error.message : String(error || 'unknown'),
    latex,
    displayMode
  });
}

export function renderLatexToHtml(latex = '', options = {}) {
  const source = String(latex || '');
  const displayMode = !!options.displayMode;
  const className = `md-math ${displayMode ? 'md-math--block' : 'md-math--inline'}`;

  try {
    const katex = getKatex();
    if (!katex || typeof katex.renderToString !== 'function') {
      throw new Error('KaTeX unavailable');
    }
    const rendered = katex.renderToString(source, {
      displayMode,
      throwOnError: true,
      strict: 'warn',
      trust: false,
      output: 'html'
    });
    return `<span class="${className}">${rendered}</span>`;
  } catch (error) {
    logMathWarning(error, source, displayMode);
    return `<span class="md-math md-math--error">${escapeHtml(source)}</span>`;
  }
}
