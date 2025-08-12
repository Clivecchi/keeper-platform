import React from 'react';

export interface TokenPropConfig {
  name: string;
  avatarUrl?: string;
  persona?: string;
  voice?: { provider: 'elevenlabs'|'none'; voiceId?: string };
  tools?: string[];
  domainScope?: Array<'People'|'Moments'|'Journeys'>;
  privacy?: 'private'|'keeper'|'public';
}

export const TokenProp: React.FC<{ config: TokenPropConfig }> = ({ config }) => {
  return (
    <div className="border rounded-lg p-3 flex items-center gap-3 bg-white">
      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
        {config.avatarUrl ? <img src={config.avatarUrl} alt={config.name} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="flex-1">
        <div className="font-medium">{config.name}</div>
        <div className="text-xs text-slate-500">Coming soon</div>
      </div>
      <span className="text-[10px] uppercase bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Beta</span>
    </div>
  );
};

export default TokenProp;


