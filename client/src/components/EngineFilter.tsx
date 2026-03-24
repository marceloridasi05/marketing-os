export type EngineType = '' | 'SMB' | 'ENTERPRISE';

const ENGINE_OPTIONS: { value: EngineType; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'SMB', label: 'SMB' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

export function EngineFilter({ value, onChange }: { value: EngineType; onChange: (v: EngineType) => void }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
      <span className="text-[10px] font-medium text-gray-400 uppercase mr-1">Engine</span>
      {ENGINE_OPTIONS.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            value === o.value
              ? 'bg-gray-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EngineSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Engine</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
        <option value="">— (Nenhum)</option>
        <option value="SMB">SMB</option>
        <option value="ENTERPRISE">Enterprise</option>
      </select>
    </div>
  );
}
