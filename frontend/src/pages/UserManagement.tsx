import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail, Shield, UserPlus, Key, UserCheck, CheckCircle2, Users, Search, ArrowLeft, ArrowRight, Globe, Clock, Briefcase, Building2,
  Truck, Trash2, BarChart3
} from 'lucide-react';
import { Card, Table, Modal, Button, Input, EmptyState, UserStats, UserCard, UserWizard, UserDetails } from '@/components';
import { useStore } from '@/context';
import { Role, RequestStatus, PermissionRequest, ActionType, EntityType, UserPresence, NotificationType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, formatRole } from '@/utils/helpers';
import { exportFromSchema, importFromSchema, exportTemplateFromSchema } from '@/utils/excelUtils';
import { userSchema } from '@/utils/excelSchemas';
import { DownloadCloud, Upload, FileDown } from 'lucide-react';
import { toast } from '@/utils/toast';
import { useConfirmDialog } from '@/components/common/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';

const UserManagement: React.FC = () => {
  const { users, trips, upsertUser, deleteUser, currentUser, saasConfig, permissionRequests, updateRequestStatus, deletePermissionRequest, companies, projects, suppliers, presenceMap, addLog, addNotification, exportEnabled } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // حالات الموافقة على طلب الوصول
  const [approvalTarget, setApprovalTarget] = useState<PermissionRequest | null>(null);
  const [approveRole, setApproveRole] = useState<Role>(Role.PROJECT_USER);
  const [approveProject, setApproveProject] = useState('');
  const [approveCompany, setApproveCompany] = useState('');
  const [tempPassword, setTempPassword] = useState(`GCM-${Math.floor(Math.random() * 90000) + 10000}`);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const isAr = saasConfig.language === 'ar';
  const isMasterAdmin = currentUser.role === Role.ADMIN;
  const isCompanyAdmin = currentUser.role === Role.COMPANY_USER;
  const { confirm, ConfirmDialogRenderer } = useConfirmDialog();
  const debouncedSearch = useDebounce(searchTerm, 250);

  const t = useMemo(() => ({
    title: isAr ? 'فريق العمل والوصول' : 'Workforce & Security Hub',
    subtitle: isAr ? 'إدارة الأدوار والمصادقة وتدقيق الوصول' : 'Strategic control of roles, authentication, and access protocols.',
    addBtn: isAr ? 'إضافة عضو جديد' : 'Invite Member',
    stats: {
      total: isAr ? 'إجمالي الفريق' : 'TOTAL HEADCOUNT',
      online: isAr ? 'نشط الآن' : 'CURRENTLY ONLINE',
      pending: isAr ? 'طلبات معلقة' : 'PENDING ACCESS',
      admins: isAr ? 'المدراء' : 'CORE ADMINS',
      trips: isAr ? 'الرحلات المسجلة' : 'TOTAL TRIPS'
    },
    tabs: {
      users: isAr ? 'سجل الفريق' : 'Workforce Registry',
      requests: isAr ? 'طلبات الوصول' : 'Access Gateway'
    },
    table: {
      email: isAr ? 'البريد الإلكتروني' : 'Digital Identity',
      role: isAr ? 'الدور المطلوب' : 'Requested Role',
      location: isAr ? 'الموقع' : 'Origin',
      date: isAr ? 'التاريخ' : 'Dispatch Date',
      status: isAr ? 'الحالة' : 'Status',
      actions: isAr ? 'الإجراءات' : 'Control'
    },
    card: {
      latestActivity: isAr ? 'النشاط الأخير' : 'LATEST ACTIVITY',
      online: isAr ? 'متصل' : 'ONLINE',
      offline: isAr ? 'خارج النظام' : 'IDLE / OFF'
    }
  }), [isAr]);

  // Workforce Statistics
  const globalStats = useMemo(() => {
    const activeUsers = users.filter(u => u.role !== Role.DEACTIVATED);
    const presenceValues = Object.values(presenceMap) as UserPresence[];
    const onlineCount = presenceValues.filter(p => (Date.now() - new Date(p.lastActive).getTime() < 60000)).length;
    return {
      totalUsers: activeUsers.length,
      onlineUsers: onlineCount, // Presence map might still have them if they just got deactivated, but acceptable
      pendingRequests: permissionRequests.filter(r => r.status === RequestStatus.PENDING).length,
      admins: activeUsers.filter(u => u.role === Role.ADMIN).length,
      totalTrips: trips ? trips.length : 0
    };
  }, [users, presenceMap, permissionRequests, trips]);

  const filteredUsers = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    const baseUsers = isMasterAdmin ? users : (isCompanyAdmin ? users.filter(u => u.company_id === currentUser.company_id) : users.filter(u => u.id === currentUser.id));

    return baseUsers.filter(u =>
      u.role !== Role.DEACTIVATED &&
      (u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term))
    );
  }, [users, debouncedSearch, isMasterAdmin, isCompanyAdmin, currentUser]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handleApproveFinal = async () => {
    if (!approvalTarget) return;

    if ((approveRole === Role.COMPANY_USER || approveRole === Role.PROJECT_USER || approveRole === Role.CLIENT) && !approveCompany) {
      toast.error(isAr ? 'يجب اختيار الشركة للالتزام بقواعد النطاق' : 'Please select a company to enforce scoping rules');
      return;
    }

    if (approveRole === Role.PROJECT_USER && !approveProject) {
      toast.error(isAr ? 'يجب اختيار المشروع للالتزام بقواعد النطاق' : 'Please select a project to enforce scoping rules');
      return;
    }

    setIsSubmitting(true);
    try {
      // تسجيل المستخدم الجديد
      await upsertUser({
        id: `U${Date.now()}`,
        name: approvalTarget.email.split('@')[0],
        email: approvalTarget.email,
        password: tempPassword,
        role: approveRole,
        company_id: (approveRole === Role.COMPANY_USER || approveRole === Role.PROJECT_USER || approveRole === Role.CLIENT) ? (approveCompany || undefined) : undefined,
        project_id: (approveRole === Role.PROJECT_USER) ? (approveProject || undefined) : undefined,
        avatar: '/logo.png'
      });

      // تحديث حالة الطلب
      await updateRequestStatus(approvalTarget.id, RequestStatus.APPROVED);

      // لوج العملية
      addLog(ActionType.CREATED, EntityType.USER, approvalTarget.id, approvalTarget.email, `Approved access request and sent invitation with role ${approveRole}`);

      addNotification({
        title: 'Success',
        message: isAr ? `تم قبول الطلب وإرسال الإيميل للدخول بكلمة المرور: ${tempPassword}` : `Access Approved! Invitation sent to ${approvalTarget.email} with password: ${tempPassword}`,
        type: NotificationType.SUCCESS
      });

      setApprovalTarget(null);
    } catch (error: any) {
      addNotification({
        title: 'Error',
        message: error.message || 'Failed to approve request',
        type: NotificationType.ERROR
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = (req: PermissionRequest) => {
    updateRequestStatus(req.id, RequestStatus.REJECTED);
    addLog(ActionType.UPDATED, EntityType.USER, req.id, req.email, 'Rejected access request');
    toast.info(isAr ? 'تم رفض الطلب وتسجيل الإجراء' : 'Access Request Rejected and logged.');
  };

  const handleSaveUser = async (userData: any) => {
    // Logic from handleInvite
    let finalCompanyId = userData.companyId;
    if (!finalCompanyId && userData.projectId) {
      const proj = projects.find(p => p.project_id === userData.projectId);
      if (proj) finalCompanyId = proj.company_id;
    }

    setIsSubmitting(true);
    try {
      await upsertUser({
        id: editingUser?.id || `U${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: userData.password || undefined,
        role: userData.role,
        company_id: finalCompanyId || undefined,
        project_id: userData.projectId || undefined,
        supplier_id: userData.supplierId || undefined,
        avatar: userData.avatar
      });
      setIsInviteModalOpen(false);
      setEditingUser(null);
      addNotification({
        title: 'Success',
        message: isAr ? 'تم حفظ التغييرات' : 'User profile synchronized',
        type: NotificationType.SUCCESS
      });
    } catch (error: any) {
      addNotification({
        title: 'Error',
        message: error.message || 'Failed to save user',
        type: NotificationType.ERROR
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const { added, failed } = await importFromSchema(file, userSchema, users, upsertUser);
      addNotification({
        title: isAr ? 'تم الاستيراد' : 'Import Complete',
        message: isAr ? `تم استيراد ${added} مستخدم` : `Successfully imported ${added} users`,
        type: NotificationType.SUCCESS
      });
    } catch (err) {
      addNotification({
        title: 'Error',
        message: isAr ? 'فشل استيراد' : 'Failed to import Excel data',
        type: NotificationType.ERROR
      });
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return <Shield className="text-primary" />;
      case Role.COMPANY_USER: return <Building2 className="text-success" />;
      case Role.PROJECT_USER: return <Briefcase className="text-primary" />;
      case Role.CLIENT: return <Building2 className="text-primary" />;
      case Role.SUBCONTRACTOR: return <Truck className="text-amber" />;
      case Role.DRIVER: return <Truck className="text-blue-500" />;
      case Role.REPORTS_MANAGER: return <BarChart3 className="text-purple-500" />;
      default: return <Shield className="text-text-subtle" />;
    }
  };

  const getAvailableRoles = () => {
    if (!approvalTarget?.role) return [Role.COMPANY_USER, Role.PROJECT_USER, Role.DATA_ENTRY, Role.LOGISTICS, Role.ACCOUNTANT, Role.REPORTS_MANAGER, Role.DRIVER];

    if (approvalTarget.role === 'CLIENT') return [Role.CLIENT];
    if (approvalTarget.role === 'SUBCONTRACTOR') return [Role.SUBCONTRACTOR];

    // Default staff roles if 'STAFF' or unknown
    return [Role.COMPANY_USER, Role.PROJECT_USER, Role.DATA_ENTRY, Role.LOGISTICS, Role.ACCOUNTANT, Role.REPORTS_MANAGER, Role.DRIVER];
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-40 px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-4 tracking-tight uppercase text-text-main">
            <div className="p-3 bg-primary shadow-xl shadow-primary/20 rounded-2xl text-surface">
              <Shield size={32} />
            </div>
            {t.title}
          </h1>
          <p className="text-text-subtle font-bold mt-2">
            {t.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {exportEnabled && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportFromSchema(users, userSchema, `GCM_Workforce_${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}`)}
                icon={DownloadCloud}
                className="px-6 py-4 rounded-2xl"
              >
                {isAr ? 'تصدير' : 'Export'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportTemplateFromSchema(userSchema, 'GCM_User_Template')}
                icon={FileDown}
                className="px-6 py-4 rounded-2xl"
              >
                {isAr ? 'قالب' : 'Template'}
              </Button>
              <input type="file" className="hidden" id="user-excel-import" accept=".xlsx,.xls" onChange={handleImportExcel} />
              <Button
                variant="secondary"
                onClick={() => document.getElementById('user-excel-import')?.click()}
                isLoading={isImporting}
                icon={Upload}
                className="px-6 py-4 rounded-2xl"
              >
                {isAr ? 'استيراد' : 'Import'}
              </Button>
            </>
          )}

          {(isMasterAdmin || isCompanyAdmin) && (
            <Button
              variant="primary"
              onClick={() => { setEditingUser(null); setIsInviteModalOpen(true); }}
              icon={UserPlus}
              className="px-10 py-4 bg-primary border-none shadow-primary/20 font-bold uppercase tracking-widest text-xs rounded-2xl"
            >
              {t.addBtn}
            </Button>
          )}
        </div>
      </div>

      {/* Security Hub Stats */}
      <UserStats stats={globalStats} t={t} />

      {/* Tabs & Search */}
      <Card className="p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {isMasterAdmin && (
            <div className="flex bg-surface-subtle p-1.5 rounded-2xl border border-border">
              <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'users' ? 'bg-surface shadow-lg text-primary' : 'text-text-subtle'}`}>
                {isAr ? 'أعضاء النظام' : 'Workforce'}
              </button>
              <button onClick={() => setActiveTab('requests')} className={`px-8 py-3 rounded-xl text-[10px] font-bold uppercase transition-all relative ${activeTab === 'requests' ? 'bg-surface shadow-lg text-primary' : 'text-text-subtle'}`}>
                {isAr ? 'طلبات الوصول' : 'Access Log'}
                {globalStats.pendingRequests > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-surface text-[10px] rounded-full flex items-center justify-center animate-bounce border-2 border-surface">
                    {globalStats.pendingRequests}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="flex-1 max-w-md relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-primary transition-colors" size={18} />
            <Input
              className="pl-14 bg-surface-subtle border-none"
              placeholder={isAr ? 'بحث بالاسم، الإيميل...' : 'Search workforce registry...'}
              value={searchTerm}
              onChange={(val) => setSearchTerm(val)}
              dir={isAr ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'users' ? (
            filteredUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={isAr ? 'لا يوجد مستخدمين' : 'No team members found'}
                description={searchTerm ? (isAr ? 'لم نجد أي مطابق لبحثك' : 'No results matching your query in the registry.') : (isAr ? 'ابدأ بإضافة أعضاء لفريق العمل' : 'Start by inviting members to join the operational layer.')}
              />
            ) : (
              <motion.div key="users-grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                {paginatedUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    currentUser={currentUser}
                    presence={presenceMap[user.id]}
                    isAr={isAr}
                    isMasterAdmin={isMasterAdmin}
                    isCompanyAdmin={isCompanyAdmin}
                    companies={companies}
                    projects={projects}
                    t={t}
                    tripsCount={trips ? trips.filter((tr: any) => tr.driver_id === user.id || tr.supervisor_name === user.name || tr.gcm_supervisor_name === user.name).length : 0}
                    onView={(u) => setViewingUser(u)}
                    onEdit={(u) => { setEditingUser(u); setIsInviteModalOpen(true); }}
                    onDelete={deleteUser}
                  />
                ))}
              </motion.div>
            )
          ) : (
            <motion.div key="requests-table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Table<PermissionRequest>
                data={permissionRequests}
                columns={[
                  {
                    key: 'email',
                    label: t.table.email,
                    render: (val, req) => (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-surface shadow-lg shadow-primary/20">
                          <Mail size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-text-main uppercase tracking-tight">{val}</span>
                          <span className="text-[10px] font-bold text-text-subtle italic">"{req.notes || 'No notes provided'}"</span>
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'role',
                    label: t.table.role,
                    render: (role) => (
                      <div className="flex flex-col">
                        <span className="font-bold text-xs uppercase text-text-subtle">
                          {formatRole(role, isAr)}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: 'fromLocation',
                    label: t.table.location,
                    render: (val) => (
                      <div className="flex items-center gap-2 text-text-subtle font-bold">
                        <Globe size={14} className="text-blue-500" />
                        <span>{val}</span>
                      </div>
                    )
                  },
                  {
                    key: 'id',
                    label: t.table.date,
                    render: (_, req) => (
                      <div className="flex items-center gap-2 text-text-subtle font-bold">
                        <Clock size={14} className="text-amber" />
                        <span>{formatDate(req.timestamp || new Date())}</span>
                      </div>
                    )
                  },
                  {
                    key: 'status',
                    label: t.table.status,
                    render: (status) => (
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${status === RequestStatus.PENDING ? 'bg-amber-muted text-amber border border-amber/20' : 'bg-surface-subtle text-text-subtle'}`}>
                        {status}
                      </span>
                    )
                  },
                  {
                    key: 'actions',
                    label: t.table.actions,
                    className: 'text-right',
                    render: (_, req) => (
                      <div className="flex justify-end gap-2">
                        {req.status === RequestStatus.PENDING && (
                          <>
                            <button onClick={() => handleReject(req)} className="px-4 py-2 rounded-xl text-danger hover:bg-danger-muted transition-all font-bold text-xs">
                              {isAr ? 'رفض' : 'Deny'}
                            </button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setApprovalTarget(req);
                                // Map requested role to default approved role
                                if (req.role === 'CLIENT') {
                                  setApproveRole(Role.CLIENT);
                                } else if (req.role === 'SUBCONTRACTOR') {
                                  setApproveRole(Role.SUBCONTRACTOR);
                                } else {
                                  setApproveRole(Role.PROJECT_USER);
                                }
                                setTempPassword(`GCM-${Math.floor(Math.random() * 90000) + 10000}`);
                              }}
                              className="bg-primary border-none px-6"
                              icon={UserCheck}
                            >
                              {isAr ? 'قبول' : 'Provision'}
                            </Button>
                          </>
                        )}
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: isAr ? 'تأكيد الحذف' : 'Confirm Delete',
                              message: isAr ? 'هل أنت متأكد من حذف هذا الطلب نهائياً؟' : 'Are you sure you want to permanently delete this request?',
                              confirmLabel: isAr ? 'حذف' : 'Delete',
                              variant: 'danger'
                            });
                            if (ok) deletePermissionRequest(req.id);
                          }}
                          className="p-2 rounded-xl text-text-subtle hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                          title={isAr ? 'حذف الطلب' : 'Delete Request'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )
                  }
                ]}
                emptyMessage={isAr ? 'لا توجد طلبات وصول جديدة' : 'All incoming access requests have been cleared.'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* نموذج الموافقة وإعداد الحساب الجديد */}
      <Modal
        isOpen={!!approvalTarget}
        onClose={() => setApprovalTarget(null)}
        size="lg"
        title={isAr ? 'هندسة صلاحيات الحساب المعتمد' : 'Account Provisioning Protocol'}
      >
        <div className="space-y-8">
          <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20 flex items-center gap-5">
            <div className="p-4 bg-primary rounded-2xl shadow-xl shadow-primary/20 text-surface">
              <Mail size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-primary tracking-[0.2em] mb-1">{isAr ? 'الهوية الرقمية المعتمدة' : 'VERIFIED DIGITAL IDENTITY'}</p>
              <p className="text-lg font-bold text-text-main">{approvalTarget?.email}</p>
              <p className="text-xs font-bold text-text-subtle mt-1">{isAr ? 'نوع الطلب: ' : 'Requested Role: '}{formatRole(approvalTarget?.role || '', isAr)}</p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] block ml-1">{isAr ? '1. تعيين الدور الوظيفي' : 'PHASE_1: ROLE_ASSIGNMENT'}</label>
            <div className="grid grid-cols-2 gap-4">
              {getAvailableRoles().map(r => (
                <button
                  key={r}
                  onClick={() => setApproveRole(r)}
                  className={`p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-3 ${approveRole === r ? 'bg-primary text-surface border-primary shadow-xl shadow-primary/20' : 'bg-surface-subtle text-text-subtle border-transparent hover:border-primary/20'}`}
                >
                  {getRoleIcon(r)}
                  {formatRole(r, isAr)}
                </button>
              ))}
            </div>
          </div>

          <Card className="p-8 space-y-6">
            <label className="text-[10px] font-bold uppercase text-text-subtle tracking-[0.2em] block ml-1">{isAr ? '2. التبعية والوصول للمشاريع' : 'PHASE_2: DATA_SCOPE_LOCK'}</label>
            <div className="space-y-4">
              <select
                className="w-full p-4 bg-surface-subtle text-text-main rounded-2xl font-bold text-sm border-2 border-transparent focus:border-primary/20 outline-none transition-all"
                value={approveCompany}
                onChange={e => setApproveCompany(e.target.value)}
              >
                <option value="">{isAr ? '--- اختر الشركة ---' : '--- CHOOSE ORGANIZATION ---'}</option>
                {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
              </select>
              {approveRole === Role.PROJECT_USER && (
                <select
                  className="w-full p-4 bg-primary/10 text-text-main rounded-2xl font-bold text-sm border-2 border-transparent focus:border-primary/20 outline-none transition-all"
                  value={approveProject}
                  onChange={e => setApproveProject(e.target.value)}
                >
                  <option value="">{isAr ? '--- اختر المشروع ---' : '--- ASSIGN TO SITE ---'}</option>
                  {projects.filter(p => !approveCompany || p.company_id === approveCompany).map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                </select>
              )}
            </div>
          </Card>

          <Card className="p-8 space-y-4 border-amber/20 bg-amber-muted/30">
            <label className="text-[10px] font-bold uppercase text-amber tracking-[0.2em] block ml-1">{isAr ? '3. بروتوكول المصادقة المؤقت' : 'PHASE_3: INITIAL_AUTH_KEY'}</label>
            <Input
              icon={Key}
              value={tempPassword}
              onChange={setTempPassword}
              className="bg-transparent font-mono font-bold text-lg text-amber border-none !p-0 shadow-none focus:ring-0"
              containerClassName="!space-y-0"
              placeholder="AUTH_KEY"
            />
          </Card>

          <Button
            variant="primary"
            onClick={handleApproveFinal}
            isLoading={isSubmitting}
            className="w-full py-6 bg-primary border-none shadow-primary/20 text-lg uppercase tracking-widest"
            icon={CheckCircle2}
          >
            {isAr ? 'تفعيل الحساب وبدء التشغيل' : 'PROVISION & NOTIFY'}
          </Button>
        </div>
      </Modal>

      <UserWizard
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSave={handleSaveUser}
        isSubmitting={isSubmitting}
        editingUser={editingUser}
        isAr={isAr}
        isCompanyAdmin={isCompanyAdmin}
        currentUser={currentUser}
        companies={companies}
        projects={projects}
        suppliers={suppliers}
      />

      <Modal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        title={isAr ? 'الملف الشخصي للموظف' : 'Employee Profile'}
        size="2xl"
      >
        {viewingUser && (
          <UserDetails
            user={viewingUser}
            presence={presenceMap[viewingUser.id]}
            isAr={isAr}
            companies={companies}
            projects={projects}
            trips={trips || []}
            onEdit={() => {
              setViewingUser(null);
              setEditingUser(viewingUser);
              setIsInviteModalOpen(true);
            }}
          />
        )}
      </Modal>

      {/* Pagination Footer */}
      {(activeTab === 'users' && totalPages > 1) && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-border p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-text-subtle whitespace-nowrap">
              {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </span>
            <div className="flex gap-2" dir="ltr">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={ArrowLeft}
              >
                {isAr ? 'السابق' : 'Previous'}
              </Button>
              <div className="hidden sm:flex gap-1 justify-center min-w-[120px]">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                    if (p > totalPages) p = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === p
                        ? 'bg-primary text-surface shadow-lg shadow-primary/20'
                        : 'text-text-subtle hover:bg-surface-subtle'
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                icon={ArrowRight}
                iconPosition="right"
              >
                {isAr ? 'التالي' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      )
      }
    <ConfirmDialogRenderer />
    </div >
  );
};

export default UserManagement;
