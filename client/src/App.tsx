import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Performance } from './pages/Performance';
import { Budget } from './pages/Budget';
import { Plan } from './pages/Plan';
import { SettingsPage } from './pages/SettingsPage';
import { SiteData } from './pages/SiteData';
import { LinkedinPage } from './pages/LinkedinPage';
import { AdsBudgets } from './pages/AdsBudgets';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/ads-budgets" element={<AdsBudgets />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/site-data" element={<SiteData />} />
          <Route path="/linkedin-page" element={<LinkedinPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
