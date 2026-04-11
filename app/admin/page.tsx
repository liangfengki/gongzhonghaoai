'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/use-user';
import Nav from '@/components/Nav';
import { Shield, Coins, Plus, Minus, Search, Users, FileText, BarChart3, TrendingUp } from 'lucide-react';

interface UserItem {
  id: string;
  username: string;
  email: string;
  credits: number;
  isAdmin: boolean;
  createdAt: string;
  articleCount: number;
}

interface Stats {
  totalUsers: number;
  totalCreditsInSystem: number;
  articlesToday: number;
  articlesTotal: number;
  newUsersThisWeek: number;
}

interface UsageLog {
  id: string;
  userId: string;
  username: string;
  type: string;
  creditsUsed: number;
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  // Users
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Credit edit modal
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [editAction, setEditAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Usage history modal
  const [historyTarget, setHistoryTarget] = useState<UserItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<UsageLog[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!userLoading && !user?.isAdmin) {
      router.push('/');
    }
  }, [user, userLoading, router]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers();
      fetchStats();
    }
  }, [user, fetchUsers, fetchStats]);

  const fetchHistory = useCallback(async (userId: string, page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/usage?userId=${userId}&page=${page}&pageSize=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.logs);
        setHistoryTotal(data.total);
        setHistoryPage(page);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = (u: UserItem) => {
    setHistoryTarget(u);
    fetchHistory(u.id, 1);
  };

  const handleUpdateCredits = async () => {
    if (!editTarget || !editAmount) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editTarget.id,
          amount: parseInt(editAmount, 10),
          action: editAction,
        }),
      });
      if (res.ok) {
        await fetchUsers();
        await fetchStats();
        setEditTarget(null);
        setEditAmount('');
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const historyTotalPages = Math.ceil(historyTotal / PAGE_SIZE);

  if (userLoading || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav />
      <main className="flex-1">
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <Shield className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
          <p className="text-sm text-gray-500">数据概览与用户管理</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="总用户数" value={stats?.totalUsers ?? '-'} color="blue" />
        <StatCard icon={Coins} label="已发放总积分" value={stats?.totalCreditsInSystem ?? '-'} color="amber" />
        <StatCard icon={FileText} label="今日生成文章" value={stats?.articlesToday ?? '-'} color="green" />
        <StatCard icon={BarChart3} label="累计生成文章" value={stats?.articlesTotal ?? '-'} color="purple" />
      </div>

      {/* New users this week badge */}
      {stats && (
        <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm">
          <TrendingUp size={15} className="text-blue-600" />
          <span className="text-blue-700">近 7 天新增 <strong>{stats.newUsersThisWeek}</strong> 位用户</span>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索用户名或邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">积分</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">生成文章</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usersLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">加载中...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">暂无用户</td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{u.username}</span>
                      {u.isAdmin && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">管理员</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                      <Coins size={13} />
                      {u.credits}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 font-medium">{u.articleCount}</span>
                    <span className="text-xs text-gray-400 ml-1">篇</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openHistory(u)}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                      >
                        查看记录
                      </button>
                      <button
                        onClick={() => { setEditTarget(u); setEditAction('add'); setEditAmount(''); }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        修改积分
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Credit Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">修改积分</h3>
            <p className="text-sm text-gray-500 mb-4">用户：{editTarget.username}（当前 {editTarget.credits} 积分）</p>

            <div className="flex gap-2 mb-4">
              {([
                { value: 'add' as const, label: '增加', icon: Plus, color: 'bg-green-100 text-green-700' },
                { value: 'deduct' as const, label: '扣除', icon: Minus, color: 'bg-red-100 text-red-700' },
                { value: 'set' as const, label: '设置为', icon: Coins, color: 'bg-blue-100 text-blue-700' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEditAction(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    editAction === opt.value ? opt.color : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <opt.icon size={14} />
                  {opt.label}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="输入数量"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateCredits}
                disabled={saving || !editAmount}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {historyTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setHistoryTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">使用记录</h3>
              <span className="text-sm text-gray-500">{historyTarget.username}</span>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-gray-400">加载中...</div>
            ) : historyLogs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">暂无使用记录</div>
            ) : (
              <>
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">时间</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">类型</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">消耗积分</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historyLogs.map(log => (
                        <tr key={log.id}>
                          <td className="px-3 py-2.5 text-sm text-gray-600">
                            {new Date(log.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                              {log.type === 'article' ? '文章生成' : log.type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-700 text-right font-medium">
                            -{log.creditsUsed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                    <span className="text-xs text-gray-400">共 {historyTotal} 条</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchHistory(historyTarget.id, historyPage - 1)}
                        disabled={historyPage <= 1}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-gray-500 self-center">{historyPage} / {historyTotalPages}</span>
                      <button
                        onClick={() => fetchHistory(historyTarget.id, historyPage + 1)}
                        disabled={historyPage >= historyTotalPages}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setHistoryTarget(null)}
              className="mt-4 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
      </main>
    </div>
  );
}

// Inline StatCard component
function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={20} className={c.icon} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}
