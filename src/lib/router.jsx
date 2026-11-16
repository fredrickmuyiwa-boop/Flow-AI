// Minimal hash router: works on Vercel, static hosts and sandboxed previews
// without server rewrites. Routes look like  #/leads/lead_123?tab=emails
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext(null);

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(query)) };
}

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(parseHash);

  useEffect(() => {
    const onChange = () => setLocation(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to) => {
    const target = to.startsWith('#') ? to : `#${to}`;
    if (window.location.hash === target) setLocation(parseHash());
    else window.location.hash = target;
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

/** Match "/leads/:id" against a path. Returns params or null. */
export function matchPath(pattern, path) {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, className, children, ...rest }) {
  return (
    <a href={`#${to}`} className={className} {...rest}>
      {children}
    </a>
  );
}
