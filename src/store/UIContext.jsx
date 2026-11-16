// Cross-page UI affordances: the global "Add lead" form.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import LeadForm from '../components/leads/LeadForm';
import { useStore } from './AppStore';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const { actions } = useStore();
  const toast = useToast();
  const { navigate } = useRouter();
  const [leadFormOpen, setLeadFormOpen] = useState(false);

  const notifyRuns = useCallback(
    (logs) => {
      if (!logs?.length) return;
      const ok = logs.filter((l) => l.status === 'success').length;
      const names = [...new Set(logs.map((l) => l.workflowName))].join(', ');
      toast.info(`${logs.length} automation${logs.length > 1 ? 's' : ''} ran automatically`, `${names} — ${ok} succeeded, ${logs.length - ok} skipped or failed.`, {
        action: { label: 'View logs', onClick: () => navigate('/logs') },
        duration: 6000,
      });
    },
    [toast, navigate],
  );

  const createLead = useCallback(
    (data) => {
      const { lead, logs } = actions.addLead(data);
      setLeadFormOpen(false);
      toast.success('Lead added', `${lead.name} is now in your CRM.`, { action: { label: 'Open profile', onClick: () => navigate(`/leads/${lead.id}`) } });
      setTimeout(() => notifyRuns(logs), 350);
      return lead;
    },
    [actions, toast, navigate, notifyRuns],
  );

  const value = useMemo(() => ({ openLeadForm: () => setLeadFormOpen(true), notifyRuns }), [notifyRuns]);

  return (
    <UIContext.Provider value={value}>
      {children}
      <LeadForm open={leadFormOpen} onClose={() => setLeadFormOpen(false)} onSubmit={createLead} />
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
