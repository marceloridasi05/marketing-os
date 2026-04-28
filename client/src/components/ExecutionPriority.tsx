import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card } from './Card';
import { TrendingUp, Zap, Target, AlertCircle } from 'lucide-react';

interface PrioritizedItem {
  id: number;
  title?: string;
  hypothesis?: string;
  action?: string;
  name?: string;
  priority?: string;
  status?: string;
  category?: string;
  expectedImpact?: string;
  estimatedEffort?: string;
  impactLevel?: string;
  effortEstimate?: string;
  priorityScore?: number;
  targetDate?: string;
  duration?: string;
}

interface ItemWithType extends PrioritizedItem {
  type: 'idea' | 'experiment' | 'initiative';
  displayName: string;
  displayPriority: string;
}

function getPriorityInfo(impact?: string, effort?: string) {
  const impactVal = (impact === 'high' ? 3 : impact === 'medium' ? 2 : 1);
  const effortVal = (effort === 'high' ? 3 : effort === 'medium' ? 2 : 1);
  const score = impactVal / effortVal;
  let tier = 'D', color = 'bg-gray-100 text-gray-600', recommendation = 'Deprioritizar';
  if (score >= 2.5) {
    tier = 'A';
    color = 'bg-red-100 text-red-700';
    recommendation = 'Executar imediatamente';
  } else if (score >= 1.5) {
    tier = 'B';
    color = 'bg-orange-100 text-orange-700';
    recommendation = 'Agendar em breve';
  } else if (score >= 1.0) {
    tier = 'C';
    color = 'bg-blue-100 text-blue-700';
    recommendation = 'Planejar para médio prazo';
  }
  return { score: parseFloat(score.toFixed(2)), tier, color, recommendation };
}

export function ExecutionPriority({ siteId }: { siteId: number | null }) {
  const [items, setItems] = useState<ItemWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'a' | 'b' | 'c'>('all');

  useEffect(() => {
    const fetchPrioritized = async () => {
      if (!siteId) {
        setLoading(false);
        return;
      }

      try {
        const [ideas, experiments, initiatives] = await Promise.all([
          api.get<any[]>('/ideas/prioritized?siteId=' + siteId + '&limit=20'),
          api.get<any[]>('/experiments/prioritized?siteId=' + siteId + '&limit=20'),
          api.get<any[]>('/initiatives/prioritized?siteId=' + siteId + '&limit=20'),
        ]);

        const allItems: ItemWithType[] = [
          ...ideas.map(i => ({
            ...i,
            type: 'idea' as const,
            displayName: i.title,
            displayPriority: i.priority || 'medium',
          })),
          ...experiments.map(e => ({
            ...e,
            type: 'experiment' as const,
            displayName: e.hypothesis,
            displayPriority: e.priority || 'medium',
          })),
          ...initiatives.map(init => ({
            ...init,
            type: 'initiative' as const,
            displayName: init.name,
            displayPriority: init.priority || 'medium',
          })),
        ];

        // Sort by priorityScore descending
        allItems.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        setItems(allItems.slice(0, 20));
      } catch (err) {
        console.error('Error fetching prioritized items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrioritized();
  }, [siteId]);

  const getImpactEffort = (item: ItemWithType) => {
    if (item.type === 'idea') return { impact: item.impact, effort: item.effort };
    if (item.type === 'experiment') return { impact: item.expectedImpact, effort: item.estimatedEffort };
    if (item.type === 'initiative') return { impact: item.impactLevel, effort: item.effortEstimate };
    return { impact: undefined, effort: undefined };
  };

  const filtered = items.filter(item => {
    if (activeTab === 'all') return true;
    const { impact, effort } = getImpactEffort(item);
    const info = getPriorityInfo(impact, effort);
    return info.tier.toLowerCase() === activeTab.toLowerCase();
  });

  const priorityCounts = {
    a: items.filter(item => {
      const { impact, effort } = getImpactEffort(item);
      return getPriorityInfo(impact, effort).tier === 'A';
    }).length,
    b: items.filter(item => {
      const { impact, effort } = getImpactEffort(item);
      return getPriorityInfo(impact, effort).tier === 'B';
    }).length,
    c: items.filter(item => {
      const { impact, effort } = getImpactEffort(item);
      return getPriorityInfo(impact, effort).tier === 'C';
    }).length,
  };

  if (loading) {
    return (
      <Card>
        <div className="py-8 text-center text-gray-400">Carregando...</div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <AlertCircle size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhum item registrado</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-amber-500" />
        <h3 className="font-semibold text-gray-900">O que fazer a seguir</h3>
        <span className="text-xs text-gray-400 ml-auto">{items.length} itens priorizados</span>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 -mx-4 px-4">
        {['all', 'a', 'b', 'c'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'all' ? 'Todos' : `Tier ${tab.toUpperCase()}`}
            {tab !== 'all' && <span className="ml-1 text-[10px]">({priorityCounts[tab as 'a' | 'b' | 'c']})</span>}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-2 mt-4">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-sm">
            Nenhum item neste tier
          </div>
        ) : (
          filtered.map((item, idx) => {
            const { impact, effort } = getImpactEffort(item);
            const info = getPriorityInfo(impact, effort);
            const typeLabel =
              item.type === 'idea' ? '💡 Ideia' : item.type === 'experiment' ? '🧪 Experimento' : '📋 Iniciativa';

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {/* Row 1: Priority Tier + Type + Title */}
                <div className="flex items-start gap-3 mb-2">
                  <div className={`px-2.5 py-1 rounded font-bold text-xs shrink-0 ${info.color}`}>
                    {info.tier}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium">{typeLabel}</p>
                    <h4 className="text-sm font-medium text-gray-900 truncate">{item.displayName}</h4>
                  </div>
                  <span className="text-[11px] text-gray-500 shrink-0">#{item.id}</span>
                </div>

                {/* Row 2: Impact/Effort Badges + Recommendation */}
                <div className="flex items-center gap-2 flex-wrap ml-11">
                  {impact && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                      {impact === 'high' ? '🟠 Alto impacto' : impact === 'medium' ? '🟡 Impacto médio' : '⚪ Baixo impacto'}
                    </span>
                  )}
                  {effort && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                      {effort === 'high' ? '⬆️ Alto esforço' : effort === 'medium' ? '→ Esforço médio' : '⬇️ Baixo esforço'}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 italic ml-auto">{info.recommendation}</span>
                </div>

                {/* Row 3: Additional metadata */}
                {(item.status || item.category || item.targetDate || item.duration) && (
                  <div className="mt-2 ml-11 flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
                    {item.status && <span className="px-1.5 py-0.5 rounded bg-gray-100">{item.status}</span>}
                    {item.category && <span className="px-1.5 py-0.5 rounded bg-gray-100">{item.category}</span>}
                    {item.targetDate && <span className="px-1.5 py-0.5 rounded bg-gray-100">📅 {item.targetDate}</span>}
                    {item.duration && <span className="px-1.5 py-0.5 rounded bg-gray-100">⏱️ {item.duration}</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="font-semibold text-red-600">{priorityCounts.a}</p>
          <p className="text-gray-500">Executar agora</p>
        </div>
        <div>
          <p className="font-semibold text-orange-600">{priorityCounts.b}</p>
          <p className="text-gray-500">Agendar em breve</p>
        </div>
        <div>
          <p className="font-semibold text-blue-600">{priorityCounts.c}</p>
          <p className="text-gray-500">Planejar depois</p>
        </div>
      </div>
    </Card>
  );
}
