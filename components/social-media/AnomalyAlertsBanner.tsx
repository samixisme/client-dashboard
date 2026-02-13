import React from 'react';
import { SocialAnomaly } from '../../types';
import { AlertTriangle, TrendingDown, TrendingUp, CheckCircle, X } from 'lucide-react';

interface AnomalyAlertsBannerProps {
  anomalies: SocialAnomaly[];
  onMarkRead?: (anomalyId: string) => void;
  onDismiss?: (anomalyId: string) => void;
}

const AnomalyAlertsBanner: React.FC<AnomalyAlertsBannerProps> = ({
  anomalies,
  onMarkRead,
  onDismiss,
}) => {
  const unreadAnomalies = anomalies.filter(a => !a.isRead);

  if (unreadAnomalies.length === 0) {
    return null;
  }

  const getSeverityConfig = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: <AlertTriangle className="h-5 w-5" />,
          label: 'Critical',
        };
      case 'high':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          icon: <AlertTriangle className="h-5 w-5" />,
          label: 'High',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          icon: <TrendingDown className="h-5 w-5" />,
          label: 'Medium',
        };
      case 'low':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          icon: <TrendingUp className="h-5 w-5" />,
          label: 'Low',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Anomaly Alerts</h3>
          <p className="text-sm text-gray-400">
            {unreadAnomalies.length} unread {unreadAnomalies.length === 1 ? 'alert' : 'alerts'}
          </p>
        </div>
        {unreadAnomalies.length > 0 && (
          <button
            onClick={() => unreadAnomalies.forEach(a => onMarkRead?.(a.id))}
            className="px-4 py-2 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all duration-300 text-sm font-medium flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Alerts list */}
      <div className="grid grid-cols-1 gap-3">
        {unreadAnomalies.map((anomaly, idx) => {
          const config = getSeverityConfig(anomaly.severity);

          return (
            <div
              key={anomaly.id}
              className={`
                relative overflow-hidden rounded-xl backdrop-blur-xl border p-4
                ${config.bg} ${config.border}
                hover:shadow-lg transition-all duration-300 group
              `}
              style={{
                animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
              }}
            >
              {/* Content */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${config.bg} ${config.text}`}>
                  {config.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${config.text}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">
                      {new Date(anomaly.detectedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h4 className="font-semibold text-white mb-1">{anomaly.metric}</h4>
                  <p className="text-sm text-gray-300">{anomaly.description}</p>

                  {/* Metric values */}
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Expected</p>
                      <p className="text-sm font-semibold text-white">
                        {anomaly.expectedValue.toLocaleString()}
                      </p>
                    </div>
                    <div className={config.text}>
                      {anomaly.actualValue > anomaly.expectedValue ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Actual</p>
                      <p className={`text-sm font-semibold ${config.text}`}>
                        {anomaly.actualValue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Variance</p>
                      <p className={`text-sm font-semibold ${config.text}`}>
                        {anomaly.actualValue > anomaly.expectedValue ? '+' : ''}
                        {((anomaly.actualValue - anomaly.expectedValue) / anomaly.expectedValue * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onMarkRead?.(anomaly.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-lime-500/20 transition-colors group/btn"
                    title="Mark as read"
                  >
                    <CheckCircle className="h-4 w-4 text-gray-400 group-hover/btn:text-lime-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => onDismiss?.(anomaly.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors group/btn"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4 text-gray-400 group-hover/btn:text-red-400 transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnomalyAlertsBanner;
