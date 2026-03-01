import React from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';

export interface AIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface AIConfigPanelProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
  showApiKey: boolean;
  onToggleApiKey: () => void;
}

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({
  config, onChange, showApiKey, onToggleApiKey,
}) => (
  <div className="max-w-2xl bg-glass border border-border-color rounded-xl p-6">
    <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
      <Settings className="w-5 h-5 text-primary" />
      AI Configuration
    </h3>

    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">API Key</label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
            placeholder="Defaults to env GEMINI_API_KEY"
            className="w-full px-4 py-2 bg-glass-light border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary pr-12"
          />
          <button
            type="button"
            onClick={onToggleApiKey}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-text-secondary opacity-70">
          Leave blank to use the server's default environment API key.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Model</label>
        <select
          value={config.model}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="w-full px-4 py-2 bg-glass-light border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
        >
          <option value="gemini-pro">gemini-pro</option>
          <option value="gemini-pro-vision">gemini-pro-vision</option>
        </select>
      </div>

      <div>
        <label className="flex items-center justify-between text-sm font-medium text-text-secondary mb-1">
          <span>Temperature</span>
          <span className="text-text-primary">{config.temperature}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature}
          onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
          className="w-full accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Max Tokens</label>
        <input
          type="number"
          min="1"
          max="8192"
          value={config.maxTokens}
          onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value) || 1024 })}
          className="w-full px-4 py-2 bg-glass-light border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  </div>
);
