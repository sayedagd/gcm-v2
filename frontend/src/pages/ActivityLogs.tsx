
import React, { useState, useMemo } from 'react';
import { useStore } from '@/context';
import {
  ScrollText, Search, Calendar, User as UserIcon,
  Activity, Download, ChevronRight,
  PlusCircle, Edit3, Trash2, LogIn, LogOut, Upload, Settings,
  FileSpreadsheet, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { formatActionType, formatEntityType, formatRole } from '@/utils/helpers';
import { ActionType, EntityType, Role } from '@/types';

const ActivityLogs: React.FC = () => {
  const { logs, users, saasConfig, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const isAr = saasConfig.language === 'ar';
  const canFilterUsers = [Role.ADMIN, Role.COMPANY_USER, Role.REPORTS_MANAGER].includes(currentUser.role);

  // Security Filtering: Restrict logs based on Role
  const secureLogs = useMemo(() => {
    if (!currentUser) return [];
    if ([Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role)) return logs;

    if (currentUser.role === Role.COMPANY_USER) {
      // Company Users see logs for their company members only
      const companyUserIds = users
        .filter(u => u.company_id === currentUser.company_id)
        .map(u => u.id);
      return logs.filter(l => companyUserIds.includes(l.user_id));
    }

    // Others (Clients, Subcontractors, Staff) see ONLY their own logs
    return logs.filter(l => l.user_id === currentUser.id);
  }, [logs, currentUser, users]);

  const filteredLogs = useMemo(() => {
    return secureLogs.filter(log => {
      const matchSearch =
        (log.entity_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entity_id || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchUser = filterUser === 'all' || log.user_id === filterUser;
      const matchAction = filterAction === 'all' || log.action === filterAction;
      const matchEntity = filterEntity === 'all' || log.entity_type === filterEntity;

      let matchDate = true;
      if (dateRange.start && dateRange.end && log.timestamp) {
        try {
          const logDate = parseISO(log.timestamp);
          matchDate = isWithinInterval(logDate, {
            start: startOfDay(parseISO(dateRange.start)),
            end: endOfDay(parseISO(dateRange.end))
          });
        } catch (e) { matchDate = false; }
      }

      return matchSearch && matchUser && matchAction && matchEntity && matchDate;
    });
  }, [secureLogs, searchTerm, filterUser, filterAction, filterEntity, dateRange]);

  // Reset to page 1 when any filter changes
  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, filterUser, filterAction, filterEntity, dateRange]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case ActionType.CREATED: return <PlusCircle className="text-primary" size={16} />;
      case ActionType.UPDATED: return <Edit3 className="text-primary" size={16} />;
      case ActionType.DELETED: return <Trash2 className="text-danger" size={16} />;
      case ActionType.LOGIN: return <LogIn className="text-primary" size={16} />;
      case ActionType.LOGOUT: return <LogOut className="text-amber" size={16} />;
      case ActionType.UPLOAD: return <Upload className="text-primary" size={16} />;
      case ActionType.SETTINGS_CHANGE: return <Settings className="text-primary" size={16} />;
      case ActionType.EXPORT: return <Download className="text-text-subtle" size={16} />;
      case ActionType.IMPORT: return <Database className="text-primary" size={16} />;
      default: return <Activity className="text-text-subtle" size={16} />;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Name', 'Details'];
    const rows = filteredLogs.map(log => [
      log.timestamp,
      users.find(u => u.id === log.user_id)?.name || log.user_id,
      log.action,
      log.entity_type,
      log.entity_name,
      log.details
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `GCM_ActivityLogs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-40">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-4 text-text-main">
            <ScrollText className="text-primary" size={40} />
            {isAr ? 'سجل العمليات والأنشطة' : 'System Audit Logs'}
          </h1>
          <p className="text-text-subtle font-bold text-lg">
            {isAr ? 'مراقبة حية لكل الحركات التي تتم داخل النظام' : 'Live monitoring of all user actions and system changes'}
          </p>
        </div>
        <button onClick={handleExportCSV} className="bg-surface text-text-main px-8 py-4 rounded-2xl font-bold text-xs uppercase flex items-center gap-2 shadow-xl border border-border hover:scale-105 transition-all">
          <FileSpreadsheet size={18} /> {isAr ? 'تصدير السجل الحالي' : 'Export Current Log'}
        </button>
      </div>

      {/* Filters Hub */}
      <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-primary transition-colors" size={18} />
            <input
              className="w-full pl-12 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-bold text-sm focus:ring-2 ring-primary/20"
              placeholder={isAr ? 'بحث بالاسم أو التفاصيل...' : 'Search logs...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {canFilterUsers && (
            <div className="flex items-center gap-3 bg-surface-subtle px-4 py-2 rounded-xl border border-border focus-within:border-primary/20 transition-all">
              <UserIcon size={16} className="text-text-subtle" />
              <select className="bg-transparent border-none outline-none font-bold text-xs w-full" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                <option value="all">{isAr ? 'كل المستخدمين' : 'All Users'}</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 bg-surface-subtle px-4 py-2 rounded-xl border border-border focus-within:border-primary/20 transition-all">
            <Activity size={16} className="text-text-subtle" />
            <select className="bg-transparent border-none outline-none font-bold text-xs w-full" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="all">{isAr ? 'كل العمليات' : 'All Actions'}</option>
              {Object.values(ActionType).map(a => <option key={a} value={a}>{formatActionType(a, isAr)}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-surface-subtle px-4 py-2 rounded-xl border border-border focus-within:border-primary/20 transition-all">
            <Database size={16} className="text-text-subtle" />
            <select className="bg-transparent border-none outline-none font-bold text-xs w-full" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
              <option value="all">{isAr ? 'كل الموديلات' : 'All Entities'}</option>
              {Object.values(EntityType).map(e => <option key={e} value={e}>{formatEntityType(e, isAr)}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
          <Calendar size={16} className="text-text-subtle" />
          <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest">{isAr ? 'نطاق التاريخ' : 'Date Range'}:</span>
          <div className="flex items-center gap-3">
            <input type="date" className="bg-surface-subtle border border-border px-4 py-2 rounded-xl text-xs font-bold outline-none" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
            <ChevronRight size={14} className="text-text-subtle" />
            <input type="date" className="bg-surface-subtle border border-border px-4 py-2 rounded-xl text-xs font-bold outline-none" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>
          <button onClick={() => setDateRange({ start: '', end: '' })} className="text-[10px] font-bold text-primary uppercase hover:underline ml-auto">{isAr ? 'مسح التاريخ' : 'Clear Dates'}</button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden overflow-x-auto">
        <table className={`w-full ${isAr ? 'text-right' : 'text-left'} min-w-[1000px]`}>
          <thead>
            <tr className="bg-surface-subtle text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] border-b border-border">
              <th className="px-8 py-6">{isAr ? 'الوقت' : 'Timestamp'}</th>
              <th className="px-8 py-6">{isAr ? 'المستخدم' : 'User'}</th>
              <th className="px-8 py-6">{isAr ? 'العملية' : 'Action'}</th>
              <th className="px-8 py-6">{isAr ? 'الموديل' : 'Entity'}</th>
              <th className="px-8 py-6">{isAr ? 'التفاصيل' : 'Details'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence mode="popLayout">
              {paginatedLogs.map(log => {
                const user = users.find(u => u.id === log.user_id);
                return (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={log.id}
                    className="hover:bg-surface-subtle transition-colors"
                  >
                    <td className="px-8 py-6 whitespace-nowrap">
                      <p className="text-xs font-bold text-text-main">
                        {log.timestamp ? (format(parseISO(log.timestamp), 'yyyy-MM-dd')) : '---'}
                      </p>
                      <p className="text-[10px] font-bold text-text-subtle mt-1 uppercase tracking-widest">
                        {log.timestamp ? (format(parseISO(log.timestamp), 'HH:mm:ss')) : '---'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <img src={user?.avatar || '/logo.png'} className="w-8 h-8 rounded-lg border shadow-sm" alt="" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{user?.name || log.user_id}</p>
                          <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest truncate">{formatRole(user?.role || 'System', isAr)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-[10px] font-bold uppercase tracking-widest">{formatActionType(log.action, isAr)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="px-3 py-1.5 bg-surface-subtle rounded-lg w-fit border border-border">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{formatEntityType(log.entity_type, isAr)}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6 max-w-md">
                      <p className="text-sm font-bold text-text-main mb-1">{log.entity_name}</p>
                      <p className="text-xs text-text-subtle line-clamp-1 italic">{log.details}</p>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="p-32 text-center text-text-subtle">
            <ScrollText size={80} className="mx-auto mb-6 opacity-20" />
            <p className="text-2xl font-bold italic">{isAr ? 'لا توجد سجلات مطابقة' : 'No activity records found.'}</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-surface-subtle/50">
            <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
              {isAr
                ? `عرض ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} من ${filteredLogs.length}`
                : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of ${filteredLogs.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface hover:border-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isAr ? 'السابق' : 'Prev'}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  typeof p === 'string'
                    ? <span key={`ellipsis-${i}`} className="px-1 text-text-subtle text-xs">...</span>
                    : <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === p ? 'bg-primary-500 text-white shadow-md' : 'border border-border bg-surface hover:border-primary-500 hover:text-primary-500'}`}
                      >
                        {p}
                      </button>
                )}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface hover:border-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;

