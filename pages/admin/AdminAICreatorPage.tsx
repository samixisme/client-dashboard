import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Image as ImageIcon,
  MessageSquare,
  Mail,
  Settings,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../../hooks/useAdminApi';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AIGeneratorPanel } from '../../components/admin/ai-creator/AIGeneratorPanel';
import { AIConfigPanel, AIConfig } from '../../components/admin/ai-creator/AIConfigPanel';

type TabId = 'brand' | 'social' | 'email' | 'config';

export default function AdminAICreatorPage() {
  const { post, loading } = useAdminApi();
  const [activeTab, setActiveTab] = useState<TabId>('brand');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [config, setConfig] = useState<AIConfig>({
    apiKey: '', model: 'gemini-pro', temperature: 0.7, maxTokens: 1024,
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const [brandContext, setBrandContext] = useState('');
  const [brandResults, setBrandResults] = useState<any>(null);
  const [socialTopic, setSocialTopic] = useState('');
  const [socialBrand, setSocialBrand] = useState('');
  const [socialResults, setSocialResults] = useState<any>(null);
  const [emailPrompt, setEmailPrompt] = useState('');
  const [emailResults, setEmailResults] = useState<any>(null);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'brand', label: 'Brand Assets', icon: ImageIcon },
    { id: 'social', label: 'Social Captions', icon: MessageSquare },
    { id: 'email', label: 'Email Templates', icon: Mail },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderResultCard = (title: string, content: string | string[], idKey: string) => {
    if (!content) return null;
    return (
      <div className="bg-glass border border-border-color rounded-xl p-5 mb-4 relative group" key={idKey}>
        <h4 className="text-sm font-semibold text-text-primary mb-3">{title}</h4>
        {Array.isArray(content) ? (
          <ul className="space-y-2">
            {content.map((item, idx) => (
              <li key={idx} className="text-sm text-text-secondary pl-4 relative">
                <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{content}</p>
        )}
        <button
          onClick={() => handleCopy(Array.isArray(content) ? content.join('\n') : content, idKey)}
          className="absolute top-4 right-4 p-2 bg-glass-light hover:bg-surface border border-border-color rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy to clipboard"
        >
          {copiedKey === idKey ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-text-secondary" />}
        </button>
      </div>
    );
  };

  const handleGenerate = async (endpoint: string, payload: Record<string, unknown>, setter: (v: any) => void, successMsg: string) => {
    const res = await post<any>(endpoint, { ...payload, config });
    if (res) {
      setter(res);
      toast.success(successMsg);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="AI Creator"
        description="Generate brand assets, social captions, and email templates using AI."
        actions={
          <button
            onClick={() => setActiveTab('config')}
            className="p-2 bg-glass border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            title="Configuration"
          >
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex space-x-2 border-b border-border-color mb-6 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-color'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'brand' && (
            <AIGeneratorPanel
              title="Generate Brand Assets"
              icon={<Wand2 className="w-5 h-5 text-primary" />}
              emptyIcon={<ImageIcon className="w-12 h-12 text-text-secondary" />}
              emptyTitle="No assets generated"
              emptyDescription="Fill out the brand context form to generate color palettes, brand voice, and logo concepts."
              loading={loading}
              results={brandResults}
              onSubmit={(e) => { e.preventDefault(); if (!brandContext) return toast.error('Please provide brand context'); handleGenerate('/ai/generate-brand-assets', { context: brandContext }, setBrandResults, 'Brand assets generated successfully!'); }}
              submitLabel="Generate Assets"
              renderResults={() => (
                <>
                  {renderResultCard('Color Palettes', brandResults.colorPalettes || brandResults.palettes || brandResults.colors, 'brand-colors')}
                  {renderResultCard('Brand Voice', brandResults.brandVoice || brandResults.voice, 'brand-voice')}
                  {renderResultCard('Logo Concepts', brandResults.logoConcepts || brandResults.logos, 'brand-logos')}
                  {typeof brandResults === 'string' && renderResultCard('Generated Result', brandResults, 'brand-raw')}
                </>
              )}
            >
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Brand Context & Vision</label>
                <textarea
                  value={brandContext}
                  onChange={(e) => setBrandContext(e.target.value)}
                  placeholder="Describe your brand, target audience, and core values..."
                  className="w-full px-4 py-3 bg-glass-light border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary min-h-[160px] resize-y"
                />
              </div>
            </AIGeneratorPanel>
          )}

          {activeTab === 'social' && (
            <AIGeneratorPanel
              title="Social Media Caption Generator"
              icon={<MessageSquare className="w-5 h-5 text-primary" />}
              emptyIcon={<MessageSquare className="w-12 h-12 text-text-secondary" />}
              emptyTitle="No captions generated"
              emptyDescription="Provide a brand identity and topic to generate engaging social media captions."
              loading={loading}
              results={socialResults}
              onSubmit={(e) => { e.preventDefault(); if (!socialTopic || !socialBrand) return toast.error('Please fill all fields'); handleGenerate('/ai/generate-captions', { topic: socialTopic, brand: socialBrand }, setSocialResults, 'Social captions generated successfully!'); }}
              submitLabel="Generate Captions"
              renderResults={() => (
                <>
                  {Array.isArray(socialResults.captions)
                    ? socialResults.captions.map((caption: string, i: number) => renderResultCard(`Variant ${i + 1}`, caption, `caption-${i}`))
                    : renderResultCard('Generated Captions', socialResults.captions || socialResults.text || socialResults, 'captions-raw')}
                </>
              )}
            >
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Brand Name / Identity</label>
                <input type="text" value={socialBrand} onChange={(e) => setSocialBrand(e.target.value)} placeholder="e.g. Acme Corp" className="w-full px-4 py-2 bg-glass-light border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Post Topic</label>
                <textarea value={socialTopic} onChange={(e) => setSocialTopic(e.target.value)} placeholder="What is the post about? (e.g., Launching our new summer collection...)" className="w-full px-4 py-3 bg-glass-light border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y" />
              </div>
            </AIGeneratorPanel>
          )}

          {activeTab === 'email' && (
            <AIGeneratorPanel
              title="Email Template Suggestions"
              icon={<Mail className="w-5 h-5 text-primary" />}
              emptyIcon={<Mail className="w-12 h-12 text-text-secondary" />}
              emptyTitle="No email generated"
              emptyDescription="Provide an email prompt to get subject line and body suggestions."
              loading={loading}
              results={emailResults}
              onSubmit={(e) => { e.preventDefault(); if (!emailPrompt) return toast.error('Please provide an email prompt'); handleGenerate('/ai/generate-email-template', { prompt: emailPrompt }, setEmailResults, 'Email template generated successfully!'); }}
              submitLabel="Generate Email"
              renderResults={() => (
                <>
                  {renderResultCard('Subject Lines', emailResults.subjectLines || emailResults.subjects, 'email-subjects')}
                  {renderResultCard('Email Body', emailResults.body || emailResults.content || emailResults.text || emailResults, 'email-body')}
                </>
              )}
            >
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Email Prompt</label>
                <textarea value={emailPrompt} onChange={(e) => setEmailPrompt(e.target.value)} placeholder="e.g. Write a welcome email for new newsletter subscribers offering a 10% discount." className="w-full px-4 py-3 bg-glass-light border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary min-h-[160px] resize-y" />
              </div>
            </AIGeneratorPanel>
          )}

          {activeTab === 'config' && (
            <AIConfigPanel
              config={config}
              onChange={setConfig}
              showApiKey={showApiKey}
              onToggleApiKey={() => setShowApiKey(!showApiKey)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
