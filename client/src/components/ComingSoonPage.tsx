import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ComingSoonPageProps {
  title: string;
  description: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-amber-100 rounded-full">
            <Construction size={48} className="text-amber-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-lg text-gray-600 mb-8">{description}</p>

        <p className="text-sm text-gray-500 mb-6">
          Esta página está sendo desenvolvida como parte da reorganização arquitetônica do sistema.
        </p>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
      </div>
    </div>
  );
}
