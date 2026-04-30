import React from 'react';
import type { ChannelBudgetControl } from '../lib/budgetControlLogic';
import { Card } from './Card';

interface BudgetControlCardProps {
  channel: 'google' | 'meta' | 'linkedin';
  control: ChannelBudgetControl;
  isLoading?: boolean;
}

const CHANNEL_CONFIG = {
  google: {
    label: 'Google Ads',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  meta: {
    label: 'Meta',
    color: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    iconBgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    iconBgColor: 'bg-cyan-100',
    iconColor: 'text-cyan-700',
  },
};

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `R$ ${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
}

function getPacingStatusDisplay(status: string): { label: string; bgColor: string; textColor: string } {
  switch (status) {
    case 'acima':
      return {
        label: 'ACIMA DO RITMO',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
      };
    case 'abaixo':
      return {
        label: 'ABAIXO DO RITMO',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
      };
    case 'dentro':
      return {
        label: 'DENTRO DO RITMO',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-800',
      };
    case 'futuro':
      return {
        label: 'MÊS FUTURO',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
      };
    case 'nao-aplicavel':
      return {
        label: 'N/A',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600',
      };
    default:
      return {
        label: 'DESCONHECIDO',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
      };
  }
}

function getSaldoColor(
  saldo: number | null,
  verbaCadastrada: number | null
): { textColor: string; bgColor: string } {
  if (saldo === null || verbaCadastrada === null) {
    return { textColor: 'text-gray-500', bgColor: 'bg-gray-50' };
  }
  if (saldo > 0) {
    return { textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' };
  }
  if (saldo < 0) {
    return { textColor: 'text-red-700', bgColor: 'bg-red-50' };
  }
  return { textColor: 'text-gray-700', bgColor: 'bg-gray-50' };
}

function getConsumidoColor(percentage: number | null): { textColor: string } {
  if (percentage === null) return { textColor: 'text-gray-500' };
  if (percentage > 100) return { textColor: 'text-red-700' };
  if (percentage > 80) return { textColor: 'text-orange-700' };
  return { textColor: 'text-emerald-700' };
}

/**
 * BudgetControlCard
 * Displays budget control metrics for a single channel
 */
export function BudgetControlCard({ channel, control, isLoading }: BudgetControlCardProps) {
  const config = CHANNEL_CONFIG[channel];
  const pacingStatus = getPacingStatusDisplay(control.statusPacing);
  const saldoColor = getSaldoColor(control.saldoDisponivel, control.verbaMensalCadastrada);
  const consumidoColor = getConsumidoColor(control.percentualConsumido);

  if (isLoading) {
    return (
      <Card className={`${config.color} border ${config.borderColor}`}>
        <div className="p-4">
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${config.color} border ${config.borderColor} overflow-hidden`}>
      <div className="p-5 space-y-4">
        {/* Header with channel name */}
        <div className="flex items-center gap-3">
          <div className={`${config.iconBgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
            <span className={`${config.iconColor} font-bold text-sm`}>
              {channel === 'google' ? 'G' : channel === 'meta' ? 'M' : 'L'}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900">{config.label}</h3>
        </div>

        {/* Verba Cadastrada */}
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Verba Cadastrada</p>
          <p className={`text-lg font-semibold ${control.verbaMensalCadastrada === null ? 'text-gray-400' : 'text-gray-900'}`}>
            {formatCurrency(control.verbaMensalCadastrada)}
          </p>
        </div>

        {/* Consumo Atual */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Consumo Atual</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(control.consumoMensalAtual)}
          </p>
        </div>

        {/* Saldo Disponível */}
        <div className={`${saldoColor.bgColor} rounded-lg p-3`}>
          <p className="text-xs font-medium text-gray-600 mb-1">Saldo Disponível</p>
          <p className={`text-2xl font-bold ${saldoColor.textColor}`}>
            {formatCurrency(control.saldoDisponivel)}
          </p>
        </div>

        {/* Consumption percentage and status */}
        <div className="border-t border-gray-200 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Consumido</p>
            <p className={`text-sm font-semibold ${consumidoColor.textColor}`}>
              {formatPercentage(control.percentualConsumido)} de 100%
            </p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <p className="text-gray-600">Esperado</p>
            <p className="font-medium text-gray-700">{control.percentualEsperado}%</p>
          </div>

          {/* Pacing progress bar */}
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                control.percentualConsumido === null
                  ? 'bg-gray-300'
                  : control.percentualConsumido > 100
                    ? 'bg-red-500'
                    : control.percentualConsumido > 80
                      ? 'bg-orange-500'
                      : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(control.percentualConsumido ?? 0, 100)}%`,
              }}
            />
            {/* Expected marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
              style={{
                left: `${Math.min(control.percentualEsperado, 100)}%`,
              }}
              title={`Expected: ${control.percentualEsperado}%`}
            />
          </div>
        </div>

        {/* Pacing Status Badge */}
        <div className={`${pacingStatus.bgColor} rounded-lg p-3 text-center`}>
          <p className={`text-xs font-bold ${pacingStatus.textColor}`}>
            {pacingStatus.label}
          </p>
        </div>

        {/* Footer info: days and day context */}
        {control.statusPacing !== 'futuro' && control.statusPacing !== 'nao-aplicavel' && (
          <div className="border-t border-gray-200 pt-3 text-center">
            <p className="text-xs text-gray-500">
              Dia {control.diaAtual} de {control.totalDiasMes}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * BudgetControlTotalCard
 * Displays aggregated budget control metrics for all channels
 */
interface BudgetControlTotalProps {
  summary: {
    verbaMensalCadastrada: number;
    consumoMensalAtual: number;
    saldoDisponivel: number;
    percentualConsumido: number;
    statusPacing: 'acima' | 'abaixo' | 'dentro' | 'futuro' | 'nao-aplicavel';
  } | null;
  diaAtual: number;
  totalDiasMes: number;
  isLoading?: boolean;
}

export function BudgetControlTotalCard({ summary, diaAtual, totalDiasMes, isLoading }: BudgetControlTotalProps) {
  if (isLoading || !summary) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300">
        <div className="p-4">
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  const pacingStatus = getPacingStatusDisplay(summary.statusPacing);
  const saldoColor = getSaldoColor(summary.saldoDisponivel, summary.verbaMensalCadastrada);
  const consumidoColor = getConsumidoColor(summary.percentualConsumido);

  return (
    <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 overflow-hidden">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-300 w-10 h-10 rounded-lg flex items-center justify-center">
            <span className="text-gray-700 font-bold text-sm">∑</span>
          </div>
          <h3 className="text-base font-semibold text-gray-900">Total</h3>
        </div>

        {/* Verba Cadastrada */}
        <div className="border-t border-gray-300 pt-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Verba Total Cadastrada</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(summary.verbaMensalCadastrada)}
          </p>
        </div>

        {/* Consumo Atual */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Consumo Total Atual</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(summary.consumoMensalAtual)}
          </p>
        </div>

        {/* Saldo Disponível */}
        <div className={`${saldoColor.bgColor} rounded-lg p-3`}>
          <p className="text-xs font-medium text-gray-600 mb-1">Saldo Total Disponível</p>
          <p className={`text-2xl font-bold ${saldoColor.textColor}`}>
            {formatCurrency(summary.saldoDisponivel)}
          </p>
        </div>

        {/* Consumption percentage and status */}
        <div className="border-t border-gray-300 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Consumido Total</p>
            <p className={`text-sm font-semibold ${consumidoColor.textColor}`}>
              {formatPercentage(summary.percentualConsumido)} de 100%
            </p>
          </div>

          {/* Pacing progress bar */}
          <div className="relative w-full h-2 bg-gray-300 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                summary.percentualConsumido > 100
                  ? 'bg-red-600'
                  : summary.percentualConsumido > 80
                    ? 'bg-orange-600'
                    : 'bg-emerald-600'
              }`}
              style={{
                width: `${Math.min(summary.percentualConsumido, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Pacing Status Badge */}
        <div className={`${pacingStatus.bgColor} rounded-lg p-3 text-center`}>
          <p className={`text-xs font-bold ${pacingStatus.textColor}`}>
            {pacingStatus.label}
          </p>
        </div>

        {/* Footer info */}
        {summary.statusPacing !== 'futuro' && summary.statusPacing !== 'nao-aplicavel' && (
          <div className="border-t border-gray-300 pt-3 text-center">
            <p className="text-xs text-gray-600 font-medium">
              Dia {diaAtual} de {totalDiasMes}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
