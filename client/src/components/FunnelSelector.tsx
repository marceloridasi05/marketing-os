import { useFunnel } from '../context/FunnelContext';
import { Funnel } from 'lucide-react';
import { MODEL_NAMES, MODEL_DESCRIPTIONS } from '../lib/funnelModels';

export function FunnelSelector() {
  const { funnelModelId, funnelConfig, loading, setFunnelModel } = useFunnel();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await setFunnelModel(e.target.value);
    } catch (err) {
      console.error('Failed to change funnel model:', err);
    }
  };

  const currentLabel = MODEL_NAMES[funnelModelId as keyof typeof MODEL_NAMES] || funnelModelId;

  return (
    <div className="flex items-center gap-2">
      <Funnel size={16} className="text-gray-600" />
      <select
        value={funnelModelId}
        onChange={handleChange}
        disabled={loading}
        title={
          funnelConfig
            ? `${funnelConfig.name}: ${funnelConfig.description}`
            : 'Carregando modelo de funil...'
        }
        className="px-2 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        <optgroup label="Preset Models">
          <option value="aida">AIDA</option>
          <option value="aarrr">AARRR</option>
          <option value="tofu_mofu_bofu">TOFU/MOFU/BOFU</option>
          <option value="sales_led">Sales-led</option>
          <option value="hourglass">Hourglass</option>
        </optgroup>
      </select>
    </div>
  );
}
