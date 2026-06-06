"use client";

import React, { useMemo, useState } from 'react';
import { useStore } from '@/context';
import { 
    Truck, Users, Box, Plus, 
    ChevronRight, 
    AlertCircle, CheckCircle2,
    Zap, ClipboardList, Clock, XCircle
} from 'lucide-react';
import { 
    Card, Button, Badge, 
    StatCard
} from '@/components';
import { motion } from 'framer-motion';
import { Modal, Select, TextInput, Textarea, SimpleGrid, Tabs } from '@mantine/core';

type AssetType = 'VEHICLE' | 'DRIVER' | 'CONTAINER' | 'TANK';

const SubcontractorAssets: React.FC = () => {
    const { 
        currentUser, saasConfig, vehicles, drivers, 
        containers, tanks, requestAddition, suppliers, assetRequests 
    } = useStore();
    const isAr = saasConfig.language === 'ar';
    
    // --- State ---
    const [activeTab, setActiveTab] = useState<string | null>('fleet');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('VEHICLE');
    const [formData, setFormData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const mySupplier = useMemo(() => 
        suppliers.find(s => s.supplier_id === currentUser.supplier_id),
        [suppliers, currentUser.supplier_id]);

    // --- Data Filtering ---
    const myVehicles = useMemo(() => 
        (vehicles || []).filter(v => v.supplier_id === mySupplier?.supplier_id),
        [vehicles, mySupplier]);

    const myDrivers = useMemo(() => 
        (drivers || []).filter(d => d.supplier_id === mySupplier?.supplier_id),
        [drivers, mySupplier]);

    const myContainers = useMemo(() => 
        (containers || []).filter(c => c.supplier_id === mySupplier?.supplier_id),
        [containers, mySupplier]);

    const myTanks = useMemo(() => 
        (tanks || []).filter(t => t.supplier_id === mySupplier?.supplier_id),
        [tanks, mySupplier]);

    const myRequests = useMemo(() => 
        (assetRequests || []).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()),
        [assetRequests]);

    // --- Handlers ---
    const handleOpenModal = (type: AssetType = 'VEHICLE') => {
        setSelectedAssetType(type);
        setFormData({});
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await requestAddition(selectedAssetType, {
                ...formData,
                supplier_id: mySupplier?.supplier_id,
                supplier_name: mySupplier?.name
            });
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to submit request', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Helpers ---
    const renderFormFields = () => {
        switch (selectedAssetType) {
            case 'VEHICLE':
                return (
                    <SimpleGrid cols={2} spacing="md">
                        <TextInput 
                            required 
                            label={isAr ? 'رقم اللوحة' : 'Plate Number'} 
                            placeholder="1234 ABC"
                            value={formData.plate_no || ''}
                            onChange={(e) => setFormData({...formData, plate_no: e.target.value})}
                        />
                        <Select 
                            required
                            label={isAr ? 'نوع المركبة' : 'Vehicle Type'}
                            data={['Truck', 'Skip Loader', 'Hook Loader', 'Pickup']}
                            value={formData.vehicle_type || ''}
                            onChange={(val) => setFormData({...formData, vehicle_type: val})}
                        />
                        <TextInput 
                            label={isAr ? 'الموديل/السنة' : 'Model/Year'} 
                            value={formData.model || ''}
                            onChange={(e) => setFormData({...formData, model: e.target.value})}
                        />
                        <Select 
                            label={isAr ? 'نظام الملكية' : 'Ownership'}
                            data={[{ value: 'SUPPLIER', label: isAr ? 'مورد' : 'Supplier' }]}
                            defaultValue="SUPPLIER"
                            disabled
                        />
                    </SimpleGrid>
                );
            case 'DRIVER':
                return (
                    <SimpleGrid cols={2} spacing="md">
                        <TextInput 
                            required 
                            label={isAr ? 'اسم السائق' : 'Driver Name'} 
                            value={formData.name || ''}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                        <TextInput 
                            required 
                            label={isAr ? 'رقم الهاتف' : 'Phone Number'} 
                            value={formData.phone || ''}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                        <TextInput 
                            required 
                            label={isAr ? 'رقم الرخصة' : 'License Number'} 
                            value={formData.license_no || ''}
                            onChange={(e) => setFormData({...formData, license_no: e.target.value})}
                        />
                        <TextInput 
                            required 
                            label={isAr ? 'رقم الإقامة' : 'Iqama Number'} 
                            value={formData.iqama_no || ''}
                            onChange={(e) => setFormData({...formData, iqama_no: e.target.value})}
                        />
                    </SimpleGrid>
                );
            case 'CONTAINER':
            case 'TANK':
                return (
                    <SimpleGrid cols={2} spacing="md">
                        <TextInput 
                            required 
                            label={isAr ? 'كود الأصل' : 'Asset Code'} 
                            placeholder="CNT-001"
                            value={formData.code || ''}
                            onChange={(e) => setFormData({...formData, code: e.target.value})}
                        />
                        <Select 
                            required
                            label={isAr ? 'الحجم' : 'Size'}
                            data={['12 Yard', '20 Yard', '30 Yard', '1000L', '2000L']}
                            value={formData.size_id || ''}
                            onChange={(val) => setFormData({...formData, size_id: val})}
                        />
                    </SimpleGrid>
                );
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle mb-2">
                        <span>{isAr ? 'بوابة الشركاء' : 'Partner Portal'}</span>
                        <span className="opacity-30">/</span>
                        <span className="text-primary">{isAr ? 'إدارة الأصول' : 'Asset Management'}</span>
                    </div>
                    <h2 className="text-3xl font-black text-text-main uppercase tracking-tighter italic">
                        {isAr ? 'جرد الأصول والموارد' : 'Asset & Resource Inventory'}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="primary" 
                        size="lg" 
                        icon={Plus} 
                        className="rounded-2xl shadow-xl shadow-primary/20 text-xs font-black tracking-widest px-8"
                        onClick={() => handleOpenModal('VEHICLE')}
                    >
                        {isAr ? 'إضافة أصل جديد' : 'ADD NEW ASSET'}
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                    title={isAr ? 'إجمالي الأسطول' : 'Total Fleet'}
                    value={myVehicles.length}
                    icon={Truck}
                    variant="primary"
                />
                <StatCard 
                    title={isAr ? 'فريق العمل' : 'Active Staff'}
                    value={myDrivers.length}
                    icon={Users}
                    variant="indigo"
                />
                <StatCard 
                    title={isAr ? 'الحاويات' : 'Containers'}
                    value={myContainers.length}
                    icon={Box}
                    variant="emerald"
                />
                <StatCard 
                    title={isAr ? 'الخزانات' : 'Tanks & Units'}
                    value={myTanks.length}
                    icon={Zap}
                    variant="amber"
                />
            </div>

            {/* Content Tabs */}
            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" className="space-y-6">
                <Tabs.List className="bg-surface-subtle p-1.5 rounded-2xl border border-border inline-flex">
                    <Tabs.Tab value="fleet" leftSection={<Truck size={14} />} className="font-bold text-xs px-6 rounded-xl">
                        {isAr ? 'الأسطول' : 'Fleet'}
                    </Tabs.Tab>
                    <Tabs.Tab value="staff" leftSection={<Users size={14} />} className="font-bold text-xs px-6 rounded-xl">
                        {isAr ? 'السائقين' : 'Staff'}
                    </Tabs.Tab>
                    <Tabs.Tab value="logistics" leftSection={<Box size={14} />} className="font-bold text-xs px-6 rounded-xl">
                        {isAr ? 'المعدات' : 'Equipment'}
                    </Tabs.Tab>
                    <Tabs.Tab value="requests" leftSection={<ClipboardList size={14} />} className="font-bold text-xs px-6 rounded-xl">
                        {isAr ? 'الطلبات' : 'Requests'}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="fleet">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {myVehicles.map(vehicle => (
                            <motion.div layout key={vehicle.vehicle_id}>
                                <Card className="p-6 h-full border border-border hover:border-primary/30 transition-all rounded-[2rem] group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-surface-subtle rounded-2xl text-primary border border-border group-hover:scale-110 transition-transform">
                                            <Truck size={24} />
                                        </div>
                                        <Badge variant={vehicle.status === 'ACTIVE' ? 'emerald' : 'amber'}>
                                            {vehicle.status}
                                        </Badge>
                                    </div>
                                    <h3 className="text-xl font-black text-text-main mb-1">{vehicle.plate_no}</h3>
                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-6">{vehicle.vehicle_type}</p>
                                    
                                    <div className="space-y-3 pt-4 border-t border-border">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-subtle">{isAr ? 'التصاريح' : 'Permits'}</span>
                                            <span className="font-bold text-primary">{vehicle.permit_count}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-subtle">{isAr ? 'المناطق' : 'Zones'}</span>
                                            <span className="font-bold truncate max-w-[120px]">{vehicle.permit_zones || '---'}</span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </Tabs.Panel>

                <Tabs.Panel value="staff">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {myDrivers.map(driver => (
                            <motion.div layout key={driver.driver_id}>
                                <Card className="p-6 h-full border border-border hover:border-primary/30 transition-all rounded-[2rem] group">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 bg-surface-subtle border border-border rounded-2xl flex items-center justify-center text-text-subtle group-hover:text-primary transition-colors">
                                            <Users size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-text-main leading-tight">{driver.name}</h3>
                                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{driver.phone}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 pt-4 border-t border-border">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-subtle">{isAr ? 'رخصة القيادة' : 'License'}</span>
                                            <span className="font-bold">{driver.license_no}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-subtle">{isAr ? 'الإقامة' : 'Iqama'}</span>
                                            <span className="font-bold">{driver.iqama_no}</span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </Tabs.Panel>

                <Tabs.Panel value="logistics">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[...myContainers, ...myTanks].map((item: any) => (
                            <motion.div layout key={item.container_id || item.tank_id}>
                                <Card className="p-6 h-full border border-border hover:border-primary/30 transition-all rounded-[2rem] group">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="p-3 bg-surface-subtle rounded-2xl text-emerald-500 border border-border">
                                            {item.container_id ? <Box size={24} /> : <Zap size={24} />}
                                        </div>
                                        <Badge variant="primary">{item.size_id}</Badge>
                                    </div>
                                    <h3 className="text-xl font-black text-text-main mb-1">{item.code}</h3>
                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-4">
                                        {item.container_id ? (isAr ? 'حاوية' : 'Container') : (isAr ? 'خزان' : 'Tank')}
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <div className="flex items-center gap-2 text-xs text-text-subtle">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            <span>{isAr ? 'الحالة: متاح' : 'Status: Available'}</span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </Tabs.Panel>

                <Tabs.Panel value="requests">
                    <div className="space-y-4">
                        {myRequests.length === 0 ? (
                            <div className="p-12 text-center bg-surface-subtle rounded-[2rem] border border-dashed border-border">
                                <ClipboardList size={48} className="mx-auto text-text-subtle mb-4 opacity-20" />
                                <p className="text-text-subtle font-bold italic uppercase tracking-widest text-xs">
                                    {isAr ? 'لا توجد طلبات سابقة' : 'No previous requests found'}
                                </p>
                            </div>
                        ) : (
                            myRequests.map((req) => (
                                <motion.div layout key={req.id}>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-surface border border-border rounded-3xl hover:border-primary/30 transition-all gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${
                                                req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                req.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                                'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {req.status === 'APPROVED' ? <CheckCircle2 size={24} /> :
                                                 req.status === 'REJECTED' ? <XCircle size={24} /> :
                                                 <Clock size={24} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-primary uppercase tracking-widest">{req.type}</span>
                                                    <span className="text-[10px] text-text-subtle opacity-50">•</span>
                                                    <span className="text-[10px] font-bold text-text-subtle">
                                                        {new Date(req.created_at || '').toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                                                    </span>
                                                </div>
                                                <h4 className="text-lg font-black text-text-main leading-tight italic">
                                                    {req.data?.plate_no || req.data?.name || req.data?.code || (isAr ? 'طلب جديد' : 'New Request')}
                                                </h4>
                                                {req.notes && (
                                                    <p className="text-[10px] text-text-subtle mt-1 font-medium">{req.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden md:block">
                                                <p className="text-[10px] font-black text-text-subtle uppercase tracking-widest mb-1 opacity-50">
                                                    {isAr ? 'الحالة الحالية' : 'CURRENT STATUS'}
                                                </p>
                                                <Badge variant={
                                                    req.status === 'APPROVED' ? 'emerald' :
                                                    req.status === 'REJECTED' ? 'rose' : 'amber'
                                                }>
                                                    {req.status}
                                                </Badge>
                                            </div>
                                            <div className="md:hidden flex justify-between items-center w-full pt-4 border-t border-border">
                                                <span className="text-[10px] font-bold text-text-subtle uppercase">{isAr ? 'الحالة:' : 'Status:'}</span>
                                                <Badge variant={
                                                    req.status === 'APPROVED' ? 'emerald' :
                                                    req.status === 'REJECTED' ? 'rose' : 'amber'
                                                }>
                                                    {req.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </Tabs.Panel>
            </Tabs>

            {/* Unified Request Modal */}
            <Modal
                opened={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    <div className="flex items-center gap-3 p-2">
                        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-text-main uppercase tracking-tighter">
                                {isAr ? 'إرسال طلب إضافة أصل' : 'Submit Asset Request'}
                            </h3>
                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                                {isAr ? 'سيتم مراجعة الطلب من قبل الإدارة' : 'Request will be reviewed by administration'}
                            </p>
                        </div>
                    </div>
                }
                size="xl"
                radius="2rem"
                padding="2rem"
                overlayProps={{ blur: 8, opacity: 0.4 }}
            >
                <div className="space-y-8">
                    <div className="p-6 bg-surface-subtle border border-border rounded-3xl">
                        <p className="text-[10px] font-black text-text-subtle uppercase tracking-widest mb-3 opacity-50">
                            {isAr ? '1. اختر نوع الأصل' : '1. SELECT ASSET TYPE'}
                        </p>
                        <SimpleGrid cols={4} spacing="md">
                            {[
                                { id: 'VEHICLE', icon: Truck, label: isAr ? 'مركبة' : 'Vehicle' },
                                { id: 'DRIVER', icon: Users, label: isAr ? 'سائق' : 'Driver' },
                                { id: 'CONTAINER', icon: Box, label: isAr ? 'حاوية' : 'Bin' },
                                { id: 'TANK', icon: Zap, label: isAr ? 'خزان' : 'Tank' }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setSelectedAssetType(btn.id as AssetType)}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                        selectedAssetType === btn.id 
                                        ? 'border-primary bg-primary/5 text-primary' 
                                        : 'border-border bg-surface hover:border-primary/30 text-text-subtle'
                                    }`}
                                >
                                    <btn.icon size={24} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{btn.label}</span>
                                </button>
                            ))}
                        </SimpleGrid>
                    </div>

                    <div className="p-6 border border-border rounded-3xl space-y-6">
                        <p className="text-[10px] font-black text-text-subtle uppercase tracking-widest mb-3 opacity-50">
                            {isAr ? '2. تفاصيل الأصل' : '2. ASSET DETAILS'}
                        </p>
                        {renderFormFields()}
                        
                        <Textarea 
                            label={isAr ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                            placeholder="..."
                            rows={3}
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-amber-500/80 leading-relaxed uppercase tracking-tighter">
                                {isAr 
                                    ? 'تنبيه: لن يظهر الأصل في النظام فوراً. سيقوم فريق العمل بمراجعة الطلب والمستندات قبل تفعيل المورد.' 
                                    : 'Note: The asset will not appear immediately. Our team will review the request and documentation before activation.'}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button variant="ghost" className="rounded-xl px-8" onClick={() => setIsModalOpen(false)}>
                                {isAr ? 'إلغاء' : 'Cancel'}
                            </Button>
                            <Button 
                                variant="primary" 
                                className="rounded-xl px-12 font-black shadow-lg shadow-primary/20"
                                onClick={handleSubmit}
                                isLoading={isSubmitting}
                            >
                                {isAr ? 'إرسال الطلب' : 'SUBMIT REQUEST'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SubcontractorAssets;
