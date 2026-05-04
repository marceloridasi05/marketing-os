import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SiteProvider } from './context/SiteContext';
import { FunnelProvider } from './context/FunnelContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// DASHBOARD
import { Dashboard } from './pages/Dashboard';

// DADOS OPERACIONAIS
import { SiteData } from './pages/SiteData';
import DailySpend from './pages/DailySpend';
import AcquisitionConversions from './pages/AcquisitionConversions';
import CommercialFunnel from './pages/CommercialFunnel';
import { AdsBudgets } from './pages/AdsBudgets';
import { Budget } from './pages/Budget';
import { LinkedinPage } from './pages/LinkedinPage';
import SearchConsolePage from './pages/SearchConsole';
import GscOAuthCallback from './pages/GscOAuthCallback';
import UnitEconomicsPage from './pages/UnitEconomics';
import UnitEconomicsConfig from './pages/UnitEconomicsConfig';
import BusinessMetricsMonthly from './pages/BusinessMetricsMonthly';

// CONSOLIDAÇÕES
import PerformanceSemanal from './pages/PerformanceSemanal';
import PerformanceMensal from './pages/PerformanceMensal';
import PacingMensal from './pages/PacingMensal';

// ANÁLISES
import Cruzamentos from './pages/Cruzamentos';
import InsightsAlertas from './pages/InsightsAlertas';
import Graficos from './pages/Graficos';
import GrowthLoopsPage from './pages/GrowthLoops';
import GrowthLoopsConfig from './pages/GrowthLoopsConfig';
import { Performance } from './pages/Performance';
import CommercialFunnelAnalysis from './pages/CommercialFunnelAnalysis';

// OPERAÇÃO
import { Plan } from './pages/Plan';
import { Experiments } from './pages/Experiments';
import { Ideas } from './pages/Ideas';
import Projects from './pages/Projects';
import UtmTools from './pages/UtmTools';
import { UtmBuilder } from './pages/UtmBuilder';
import { UtmLibrary } from './pages/UtmLibrary';
import { UtmAttribution } from './pages/UtmAttribution';

// REPOSITÓRIO
import MarketingSystem from './pages/MarketingSystem';
import IcpPositioning from './pages/IcpPositioning';
import Messaging from './pages/Messaging';
import Learnings from './pages/Learnings';
import Decisions from './pages/Decisions';

// CONFIGURAÇÕES
import { SettingsPage } from './pages/SettingsPage';
import { DataMappingPage } from './pages/DataMappingPage';
import DataSources from './pages/DataSources';
import FieldConfiguration from './pages/FieldConfiguration';
import Integrations from './pages/Integrations';

// Legacy (not in sidebar but kept for backward compatibility)
import { Suppliers } from './pages/Suppliers';

function App() {
  return (
    <ErrorBoundary>
    <SiteProvider>
    <FunnelProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* DASHBOARD — Executive summary */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/" element={<Dashboard />} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* DADOS OPERACIONAIS — Data entry points (9 modules) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/site-data" element={<SiteData />} />
          <Route path="/daily-spend" element={<DailySpend />} />
          <Route path="/acquisition-conversions" element={<AcquisitionConversions />} />
          <Route path="/commercial-funnel" element={<CommercialFunnel />} />
          <Route path="/budgets" element={<AdsBudgets />} />
          {/* Keep old budget routes for backward compatibility */}
          <Route path="/ads-budgets" element={<AdsBudgets />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/linkedin-page" element={<LinkedinPage />} />
          <Route path="/search-console" element={<SearchConsolePage />} />
          <Route path="/gsc-callback" element={<GscOAuthCallback />} />
          <Route path="/unit-economics" element={<UnitEconomicsPage />} />
          <Route path="/unit-economics-config" element={<UnitEconomicsConfig />} />
          <Route path="/business-metrics-monthly" element={<BusinessMetricsMonthly />} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CONSOLIDAÇÕES — Auto-aggregated views (read-only) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/performance-semanal" element={<PerformanceSemanal />} />
          <Route path="/performance-mensal" element={<PerformanceMensal />} />
          <Route path="/pacing-mensal" element={<PacingMensal />} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ANÁLISES — Cross-checks and insights */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/analyze" element={<Cruzamentos />} />
          <Route path="/insights" element={<InsightsAlertas />} />
          <Route path="/charts" element={<Graficos />} />
          <Route path="/growth-loops" element={<GrowthLoopsPage />} />
          <Route path="/growth-loops-config" element={<GrowthLoopsConfig />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/commercial-funnel-analysis" element={<CommercialFunnelAnalysis />} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* OPERAÇÃO — Projects, experiments, initiatives */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/utm-tools" element={<UtmTools />} />
          {/* Keep old UTM routes for backward compatibility */}
          <Route path="/utm-builder" element={<UtmBuilder />} />
          <Route path="/utm-library" element={<UtmLibrary />} />
          <Route path="/utm-attribution" element={<UtmAttribution />} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* REPOSITÓRIO — Strategic documentation */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/marketing-system" element={<MarketingSystem />} />
          <Route path="/icp-positioning" element={<IcpPositioning />} />
          <Route path="/messaging" element={<Messaging />} />
          <Route path="/learnings" element={<Learnings />} />
          <Route path="/decisions" element={<Decisions />} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CONFIGURAÇÕES — System setup and management */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/field-configuration" element={<FieldConfiguration />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* Keep old data-mapping route for backward compatibility */}
          <Route path="/data-mapping" element={<DataMappingPage />} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* LEGACY — Not in sidebar but kept for backward compatibility */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Route path="/suppliers" element={<Suppliers />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </FunnelProvider>
    </SiteProvider>
    </ErrorBoundary>
  );
}

export default App;
