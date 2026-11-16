import { useState } from 'react';
import { RouterProvider, useRouter, matchPath } from './lib/router';
import { StoreProvider } from './store/AppStore';
import { UIProvider, useUI } from './store/UIContext';
import { ToastProvider } from './components/ui/Toast';
import { DemoProvider, useDemo } from './components/demo/DemoContext';
import DemoGuide from './components/demo/DemoGuide';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import ErrorBoundary from './components/layout/ErrorBoundary';
import Overview from './pages/Overview';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import AutomationStudio from './pages/AutomationStudio';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Copilot from './pages/Copilot';
import Campaigns from './pages/Campaigns';
import ActivityLogs from './pages/ActivityLogs';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const ROUTES = [
  ['/', Overview],
  ['/leads', Leads],
  ['/leads/:id', LeadDetail],
  ['/automations', AutomationStudio],
  ['/automations/:id', WorkflowBuilder],
  ['/assistant', Copilot],
  ['/campaigns', Campaigns],
  ['/logs', ActivityLogs],
  ['/settings', Settings],
];

function CurrentPage() {
  const { path } = useRouter();
  for (const [pattern, Component] of ROUTES) {
    const params = matchPath(pattern, path);
    if (params) return <Component params={params} key={pattern === '/leads/:id' || pattern === '/automations/:id' ? path : pattern} />;
  }
  return <NotFound />;
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const demo = useDemo();
  const ui = useUI();
  const { path } = useRouter();
  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onRunDemo={demo.start} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} onRunDemo={demo.active ? () => demo.setMinimised(false) : demo.start} onAddLead={ui.openLeadForm} demoActive={demo.active} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-40">
          <ErrorBoundary resetKey={path}>
            <CurrentPage />
          </ErrorBoundary>
        </main>
      </div>
      <DemoGuide />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <StoreProvider>
          <UIProvider>
            <DemoProvider>
              <Shell />
            </DemoProvider>
          </UIProvider>
        </StoreProvider>
      </ToastProvider>
    </RouterProvider>
  );
}
