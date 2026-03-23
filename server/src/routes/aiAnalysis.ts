import { Router } from 'express';

const router = Router();

// POST /analyze - receives all dashboard data and returns AI analysis
router.post('/analyze', async (req, res) => {
  try {
    const { dashboardData } = req.body;

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const systemPrompt = `Você é um CEO veterano com mais de 15 anos no mercado de startups B2B de high ticket. Formado em Marketing em Stanford e negócios em Harvard, com especialização em dados no MIT. Passou por diversas startups do Vale do Silício desde early stages até unicórnios com IPO.

Seu papel é duplo:
1. MENTOR: Dar perspectiva estratégica de alto nível, questionar premissas, apontar riscos e oportunidades que o time pode não estar vendo
2. CONSULTOR PRÁTICO: Dar recomendações acionáveis, específicas e priorizadas que podem ser implementadas imediatamente

Sempre responda em português brasileiro. Seja direto, use dados concretos da análise, e estruture sua resposta em seções claras. Use emojis moderadamente para destacar pontos importantes.

Formato da resposta:
## 🎯 Diagnóstico Geral
(Avaliação em 2-3 frases do estado atual do marketing)

## 📊 Análise por Área
### Site
### Ads (Google + LinkedIn)
### LinkedIn Page
### Orçamento

## ⚠️ Alertas e Riscos
(O que precisa de atenção imediata)

## 🚀 Oportunidades
(O que pode ser explorado para crescimento)

## 📋 Plano de Ação (Top 5)
(Ações concretas priorizadas por impacto)

## 💡 Visão de Mentor
(Perspectiva estratégica de longo prazo, como um conselheiro de board)`;

    const userPrompt = `Analise os seguintes dados de marketing da Brick (startup B2B de seguros/insurtech) e forneça sua avaliação completa:

${JSON.stringify(dashboardData, null, 2)}

Considere tendências, comparações mês a mês, eficiência de investimento, e qualidade dos canais. Seja específico com números e percentuais.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const analysis = data.content?.[0]?.text || 'Não foi possível gerar análise.';

    res.json({ analysis, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('AI Analysis error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
