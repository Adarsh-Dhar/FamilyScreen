import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import { AppShell } from './components/app-shell';
import { PairingPage } from './pages/pairing';
import { DashboardPage } from './pages/dashboard';
import { RulesPage } from './pages/rules';
import { ActivityPage } from './pages/activity';
import { ReviewPage } from './pages/review';
import { InsightsPage } from './pages/insights';
import { NotificationsPage } from './pages/notifications';
import { AccountPage } from './pages/account';

function RequirePaired({ children }: { children: ReactNode }) {
  const { paired, loading } = useStore();

  // Wait for the persisted session before redirecting; otherwise the initial
  // undefined session briefly looks unpaired and sends every route to /pair.
  if (loading) return null;
  return paired ? children : <Navigate to="/pair" replace />;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/pair" element={<PairingPage />} />
          <Route
            element={
              <RequirePaired>
                <AppShell />
              </RequirePaired>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
