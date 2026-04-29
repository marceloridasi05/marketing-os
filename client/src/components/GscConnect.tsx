import React, { useState } from 'react';
import { Search, ExternalLink, AlertCircle } from 'lucide-react';
import { useSite } from '../context/SiteContext';

interface GscConnectProps {
  onConnected?: () => void;
}

export function GscConnect({ onConnected }: GscConnectProps) {
  const { selectedSite } = useSite();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!selectedSite) {
      setError('Por favor, selecione um site primeiro');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Request authorization URL from backend
      const response = await fetch(
        `/api/gsc/oauth/authorize?siteId=${selectedSite.id}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (data.authUrl) {
        // Open Google OAuth in new window
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.authUrl,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for completion
        if (popup) {
          const checkInterval = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkInterval);
              // User completed authorization
              onConnected?.();
            }
          }, 1000);

          // Stop polling after 10 minutes
          setTimeout(() => clearInterval(checkInterval), 600000);
        }
      } else {
        setError(data.error || 'Erro ao iniciar autenticação');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Search className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-900 mb-1">Conectar Google Search Console</h3>
          <p className="text-sm text-blue-700 mb-3">
            Sincronize dados de SEO e posicionamento em busca orgânica
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading || !selectedSite}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {loading ? 'Conectando...' : (
              <>
                <ExternalLink className="w-4 h-4" />
                Conectar com Google
              </>
            )}
          </button>

          <p className="text-xs text-gray-600 mt-2">
            Você será redirecionado para o Google para autorizar o acesso. Após confirmar, retorne aqui automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
