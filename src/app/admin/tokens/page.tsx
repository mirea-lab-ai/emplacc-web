'use client';

import APITokens from '@/components/settings/APITokens';

export default function AdminTokensPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="t-heading text-app">API-токены</h1>
        <p className="t-body mt-1">Выпуск и отзыв токенов <code className="text-emerald-400/80">emplacc_*</code> для MCP-сервера и интеграций</p>
      </div>
      <APITokens />
    </div>
  );
}
