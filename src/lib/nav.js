/* Client-side navigation: any component can ask the app to open a path without reloading the page. */
export const navigate = path => window.dispatchEvent(new CustomEvent('statspad:navigate', {detail: path}));

/* Paths the app renders itself; everything else (APIs, files) is left to the browser. */
export const isAppPath = path => /^\/(?:|schedule|standings|performances|stats\/[a-z0-9-]+|account|signin|teams|leaders|leaders\/(?:preseason|regular-season|playoffs)|compare|teams\/[a-z0-9-]+|games\/\d+)\/?$/.test(path);
