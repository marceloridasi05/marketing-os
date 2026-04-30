import { Card } from './Card';
import { RefreshCw, Plus } from 'lucide-react';

interface DataStatusCardProps {
  onImport: () => void;
  onManualEntry: () => void;
  syncing?: boolean;
}

export function DataStatusCard({ onImport, onManualEntry, syncing = false }: DataStatusCardProps) {
  return (
    <Card className="mb-6 border-l-4 border-blue-500">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Dados do site ainda não importados</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Esta seção precisa de dados semanais de site, blog e geração de leads para alimentar o dashboard,
            funis, insights e análise de conversão.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onImport}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Importando...' : 'Importar da Planilha Google'}
          </button>

          <button
            onClick={onManualEntry}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 flex items-center gap-2"
          >
            <Plus size={16} />
            Inserir Manualmente
          </button>
        </div>
      </div>
    </Card>
  );
}
