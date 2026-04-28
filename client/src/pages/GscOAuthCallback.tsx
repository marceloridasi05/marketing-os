import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';

export default function GscOAuthCallback() {
  const navigate = useNavigate();
  const { selectedSite } = useSite();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Autorização negada: ${error}`);
          setTimeout(() => navigate('/search-console'), 3000);
          return;
        }

        if (!code || !selectedSite) {
          setStatus('error');
          setMessage('Parâmetros inválidos');
          setTimeout(() => navigate('/search-console'), 3000);
          return;
        }

        // Exchange code for token
        const result = await api.post(`/gsc/oauth/callback?siteId=${selectedSite.id}&code=${code}`, {});

        setStatus('success');
        setMessage('Conexão estabelecida com sucesso!');
        setTimeout(() => navigate('/search-console'), 2000);
      } catch (err) {
        setStatus('error');
        setMessage(`Erro: ${err instanceof Error ? err.message : 'Falha ao conectar'}`);
        setTimeout(() => navigate('/search-console'), 3000);
      }
    }

    handleCallback();
  }, [searchParams, selectedSite, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
            <p className="text-gray-600 text-lg">Processando autorização...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <p className="text-green-600 text-lg font-medium">{message}</p>
            <p className="text-gray-600 text-sm mt-2">Redirecionando...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4 text-red-600">✗</div>
            <p className="text-red-600 text-lg font-medium">{message}</p>
            <p className="text-gray-600 text-sm mt-2">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  );
}
