import React from 'react';

/* The two owner pages, side by side under one heading. */
const TABS = [['/admin', 'Activity'], ['/admin/postkit', 'Post kit']];

export default function AdminTabs({active}) {
  return <nav className="adm-tabs" aria-label="Admin">{TABS.map(([href, label]) => <a key={href} href={href} className={href === active ? 'on' : ''} aria-current={href === active ? 'page' : undefined}>{label}</a>)}</nav>;
}
