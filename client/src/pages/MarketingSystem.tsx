/**
 * Marketing System / Strategic Canvas
 * Central strategic planning hub for Go-To-Market strategy definition
 * Part of Strategic layer
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';

interface MarketingSystemData {
  market?: string;
  positioning?: string;
  channels?: string;
  operation?: string;
  learning?: string;
}

const SECTIONS = [
  {
    id: 'market',
    label: 'Mercado & ICP',
    icon: '🎯',
    description: 'Defina seu mercado alvo, ICP e processo de compra',
    placeholder:
      'Descreva seu mercado principal, público-alvo (ICP), tamanho do mercado, tendências e processo de compra típico...',
  },
  {
    id: 'positioning',
    label: 'Posicionamento & Mensagem',
    icon: '💎',
    description: 'Defina sua proposta de valor e diferenciadores-chave',
    placeholder:
      'Qual é sua proposta de valor única? Quais são seus diferenciadores? Qual é a mensagem principal que você quer transmitir?',
  },
  {
    id: 'channels',
    label: 'Canais & Táticas',
    icon: '📢',
    description: 'Defina seus canais de aquisição e tática principal',
    placeholder:
      'Quais canais você vai usar? (paid search, social, content, partnerships, etc.). Qual é a tática principal para cada canal?',
  },
  {
    id: 'operation',
    label: 'Operação & Processo',
    icon: '⚙️',
    description: 'Defina o processo de marketing para vendas',
    placeholder:
      'Como funciona seu processo de sales? Qual é a handoff do marketing para vendas? Quais ferramentas você usa? Qual é o ciclo de vendas?',
  },
  {
    id: 'learning',
    label: 'Crescimento & Aprendizado',
    icon: '🚀',
    description: 'Defina OKRs e framework de experimentação',
    placeholder:
      'Quais são seus OKRs para este trimestre? Qual é seu framework de experimentação? Como você mede sucesso? Quais métricas são críticas?',
  },
];

export default function MarketingSystem() {
  const { selectedSite } = useSite();
  const [data, setData] = useState<MarketingSystemData>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    market: true,
    positioning: true,
    channels: true,
    operation: false,
    learning: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (!selectedSite) return;
    loadData();
  }, [selectedSite]);

  const loadData = () => {
    if (!selectedSite) return;
    try {
      const key = `marketing-system-${selectedSite.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateField = (field: string, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedSite) return;

    try {
      setSaving(true);
      setError(null);

      // Save to localStorage (primary storage)
      const key = `marketing-system-${selectedSite.id}`;
      localStorage.setItem(key, JSON.stringify(data));

      // TODO: In future, save to backend API
      // await api.post(`/marketing-system/${selectedSite.id}`, data);

      setSavedMessage('Salvo com sucesso!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      setError(`Erro ao salvar: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Tem certeza que deseja recarregar os dados? Mudanças não salvas serão perdidas.')) return;
    loadData();
    setError(null);
    setSavedMessage(null);
  };

  if (!selectedSite) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-300 p-6">
        <div className="max-w-4xl mx-auto bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-yellow-200">
          Selecione um site no painel lateral para começar
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Sistema de Marketing</h1>
          <p className="text-gray-400">Defina sua estratégia GTM (Go-To-Market) em 5 dimensões</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4 flex gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {savedMessage && (
          <div className="mb-6 bg-green-900/30 border border-green-700 rounded-lg p-4 text-green-200 text-sm">
            ✓ {savedMessage}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-3 mb-8">
          {SECTIONS.map(section => (
            <div key={section.id} className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-start justify-between hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex gap-3 items-start flex-1">
                  <span className="text-xl">{section.icon}</span>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-white">{section.label}</h2>
                    <p className="text-sm text-gray-400">{section.description}</p>
                  </div>
                </div>
                {expandedSections[section.id] ? (
                  <ChevronUp size={20} className="text-gray-400 shrink-0 mt-1" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400 shrink-0 mt-1" />
                )}
              </button>

              {/* Section Content */}
              {expandedSections[section.id] && (
                <div className="border-t border-gray-800 px-6 py-4">
                  <textarea
                    value={data[section.id as keyof MarketingSystemData] || ''}
                    onChange={e => updateField(section.id, e.target.value)}
                    placeholder={section.placeholder}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Markdown suportado • {(data[section.id as keyof MarketingSystemData] || '').length} caracteres
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg text-gray-300 font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Recarregar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            <strong>💡 Dica:</strong> Esta página armazena seu planejamento estratégico localmente. Em uma futura versão,
            você poderá sincronizar com Google Sheets para colaboração em equipe.
          </p>
        </div>
      </div>
    </div>
  );
}
