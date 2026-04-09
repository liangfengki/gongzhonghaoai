'use client';

import Nav from '@/components/Nav';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50/80">
      <Nav />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">系统设置</h1>
          <p className="text-sm text-gray-500">API 密钥等核心配置已由管理员在服务端统一管理，以确保数据安全。</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[var(--shadow-xs)] p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">安全连接已启用</h2>
          <p className="text-gray-500 text-sm">
            您的账户通过授权码登录，所有 AI 请求均已在服务器端进行加密签名和转发。您无需（也无法）在前端配置 API 密钥，请放心使用。
          </p>
        </div>
      </div>
    </div>
  );
}
