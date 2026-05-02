import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SiteProvider } from './context/SiteContext';
import { FunnelProvider } from './context/FunnelContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Performance } from './pages/Performance';
import { Budget } from './pages/Budget';
import { Plan } from './pages/Plan';
import { SettingsPage } from './pages/SettingsPage';
import { SiteData } from './pages/SiteData';
import { LinkedinPage } from './pages/LinkedinPage';
import { AdsBudgets } from './pages/AdsBudgets';
import { Suppliers } from './pages/Suppliers';
import { Ideas } from './pages/Ideas';
import { Experiments } from './pages/Experiments';
import { DataMappingPage } from './pages/DataMappingPage';
import InsightsPage from './pages/InsightsPage';
import { UtmBuilder } from './pages/UtmBuilder';
import { UtmLibrary } from './pages/UtmLibrary';
import { UtmAttribution } from './pages/UtmAttribution';
import SearchConsolePage from './pages/SearchConsole';
import GscOAuthCallback from './pages/GscOAuthCallback';
import UnitEconomicsPage from './pages/UnitEconomics';
import UnitEconomicsConfig from './pages/UnitEconomicsConfig';
import GrowthLoopsPage from './pages/GrowthLoops';
import GrowthLoopsConfig from './pages/GrowthLoopsConfig';
import CommercialFunnel from './pages/CommercialFunnel';
import MarketingSystem from './pages/MarketingSystem';
import CommercialFunnelAnalysis from './pages/CommercialFunnelAnalysis';

function App() {
  return (
    <ErrorBoundary>
    <SiteProvider>
    <FunnelProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Strategic Layer */}
          <Route path="/marketing-system" element={<MarketingSystem />} />

          {/* Operational Data Layer */}
          <Route path="/commercial-funnel" element={<CommercialFunnel />} />

          {/* Analytical Layer */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/linkedin-page" element={<LinkedinPage />} />
          <Route path="/unit-economics" element={<UnitEconomicsPage />} />
          <Route path="/unit-economics-config" element={<UnitEconomicsConfig />} />
          <Route path="/growth-loops" element={<GrowthLoopsPage />} />
          <Route path="/growth-loops-config" element={<GrowthLoopsConfig />} />
          <Route path="/commercial-funnel-analysis" element={<CommercialFunnelAnalysis />} />

          {/* Execution Layer */}
          <Route path="/plan" element={<Plan />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/search-console" element={<SearchConsolePage />} />
          <Route path="/gsc-callback" element={<GscOAuthCallback />} />
          <Route path="/utm-builder" element={<UtmBuilder />} />
          <Route path="/utm-library" element={<UtmLibrary />} />
          <Route path="/utm-attribution" element={<UtmAttribution />} />
          <Route path="/suppliers" element={<Suppliers />} />

          {/* Operational Data (continued) */}
          <Route path="/site-data" element={<SiteData />} />
          <Route path="/ads-budgets" element={<AdsBudgets />} />
          <Route path="/budget" element={<Budget />} />

          {/* Settings */}
          <Route path="/data-mapping" element={<DataMappingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </FunnelProvider>
    </SiteProvider>
    </ErrorBoundary>
  );
}

export default App;
