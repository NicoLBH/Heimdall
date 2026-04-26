import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownToHtml } from './markdown-renderer.js';

globalThis.katex = {
  renderToString(latex, options = {}) {
    if (latex.trim().endsWith('{')) throw new Error('invalid latex');
    return `<span class="katex${options.displayMode ? ' katex-display' : ''}">${latex}</span>`;
  }
};

test('renderer garde le découpage en paragraphes par défaut', () => {
  const html = renderMarkdownToHtml('ligne 1\n\nligne 2');
  assert.match(html, /<p>ligne 1<\/p><p>ligne 2<\/p>/);
});

test('renderer peut préserver les retours à la ligne des messages', () => {
  const html = renderMarkdownToHtml('ligne 1\n\nligne 2', { preserveMessageLineBreaks: true });
  assert.match(html, /<p>ligne 1<br><br>ligne 2<\/p>/);
});

test('renderer en mode message reste sécurisé sur le HTML brut', () => {
  const html = renderMarkdownToHtml('bonjour <br> test', { preserveMessageLineBreaks: true });
  assert.match(html, /bonjour &lt;br&gt; test/);
  assert.doesNotMatch(html, /bonjour <br> test/);
});

test('renderer en mode message conserve titres, citations et listes markdown', () => {
  const markdown = '# Titre\n\n> Citation\n\n- élément';
  const html = renderMarkdownToHtml(markdown, { preserveMessageLineBreaks: true });
  assert.match(html, /<h1>Titre<\/h1>/);
  assert.match(html, /<blockquote>Citation<\/blockquote>/);
  assert.match(html, /<ul><li>élément<\/li><\/ul>/);
});

test('renderer rend les maths inline avec \\( ... \\)', () => {
  const html = renderMarkdownToHtml('Pythagore: \\(a^2 + b^2 = c^2\\)');
  assert.match(html, /md-math md-math--inline/);
  assert.match(html, /katex/);
});

test('renderer rend les blocs $$...$$', () => {
  const html = renderMarkdownToHtml('$$\\int_0^1 x^2 dx$$');
  assert.match(html, /md-math md-math--block/);
  assert.match(html, /katex-display/);
});

test('renderer rend les blocs \\[ ... \\]', () => {
  const html = renderMarkdownToHtml('\\[E = mc^2\\]');
  assert.match(html, /md-math md-math--block/);
  assert.match(html, /katex-display/);
});

test('renderer conserve markdown gras et liens avec les maths', () => {
  const html = renderMarkdownToHtml('**important** [lien](https://example.com) \\(x\\)');
  assert.match(html, /<strong>important<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">lien<\/a>/);
  assert.match(html, /md-math--inline/);
});

test('renderer ne rend pas latex dans le code inline', () => {
  const html = renderMarkdownToHtml('`\\(x\\)`');
  assert.match(html, /<code>\\\(x\\\)<\/code>/);
  assert.doesNotMatch(html, /md-math/);
});

test('renderer garde preserveMessageLineBreaks avec math inline', () => {
  const html = renderMarkdownToHtml('a\n\n\\(x\\)', { preserveMessageLineBreaks: true });
  assert.match(html, /<p>a<br><br><span class="md-math md-math--inline">/);
});

test('renderer garde le message lisible en cas de formule invalide', () => {
  const html = renderMarkdownToHtml('\\(\\frac{1}{\\)');
  assert.match(html, /md-math--error/);
  assert.match(html, /\\frac/);
});

test('renderer laisse postProcessHtml traiter les références sujet', () => {
  const html = renderMarkdownToHtml('Voir #123', {
    postProcessHtml: (raw) => raw.replace('#123', '<a class="md-subject-link" href="#123">#123</a>')
  });
  assert.match(html, /md-subject-link/);
});
