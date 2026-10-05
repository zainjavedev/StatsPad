import React from 'react';

/* A small Markdown renderer for StatsPad's own articles: #/##/### headings,
   paragraphs, "- " lists, "> " quotes, **bold**, *italic* and [links](url).
   Everything becomes React elements, so no HTML is injected. */

function inline(text, keyPrefix) {
  const parts = [], pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, found;
  while ((found = pattern.exec(text))) {
    if (found.index > last) parts.push(text.slice(last, found.index));
    const key = `${keyPrefix}-${found.index}`;
    if (found[1]) parts.push(<strong key={key}>{found[1]}</strong>);
    else if (found[2]) parts.push(<em key={key}>{found[2]}</em>);
    else {
      const external = /^https?:/.test(found[4]);
      parts.push(<a key={key} href={found[4]} {...(external ? {target: '_blank', rel: 'noreferrer'} : {})}>{found[3]}</a>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({source}) {
  const blocks = source.trim().split(/\n{2,}/);
  return blocks.map((block, index) => {
    const lines = block.split('\n'), key = `b${index}`;
    const heading = block.match(/^(#{1,3})\s+(.*)$/);
    if (heading && lines.length === 1) return React.createElement(`h${heading[1].length + 1}`, {key}, inline(heading[2], key));
    if (lines.every(line => line.startsWith('- '))) return <ul key={key}>{lines.map((line, row) => <li key={row}>{inline(line.slice(2), `${key}-${row}`)}</li>)}</ul>;
    if (lines.every(line => line.startsWith('>'))) return <blockquote key={key}>{inline(lines.map(line => line.replace(/^>\s?/, '')).join(' '), key)}</blockquote>;
    return <p key={key}>{inline(lines.join(' '), key)}</p>;
  });
}
