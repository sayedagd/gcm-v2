import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface SmartDropdownProps {
    title: string;
    icon: React.ElementType;
    data: { id: string | number; name: string }[];
    selected: string | number | null;
    onSelect: (id: any) => void;
    colorClass?: string;
    isAr: boolean;
    disabled?: boolean | undefined;
    alignRight?: boolean;
}

const SmartDropdown: React.FC<SmartDropdownProps> = ({
    title,
    icon: Icon,
    data,
    selected,
    onSelect,
    colorClass = 'emerald',
    isAr,
    disabled = false,
    alignRight = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, minWidth: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const updateCoords = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 6,
                left: isAr ? (alignRight ? rect.right - 280 : rect.left) : (alignRight ? rect.right - 280 : rect.left),
                minWidth: Math.max(rect.width, 240)
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen, isAr, alignRight]);

    useEffect(() => {
        const handleClick = (e: any) => {
            if (isOpen && buttonRef.current && !buttonRef.current.contains(e.target) && !e.target.closest('.fixed-dropdown-menu')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const filteredData = data.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 active:scale-95 min-w-[140px] justify-between ${disabled ? 'opacity-50 cursor-not-allowed bg-surface-subtle border-border text-text-subtle' : selected ? `bg-${colorClass}-50 text-${colorClass}-700 border-${colorClass}-200` : `bg-surface text-text-main border-border hover:border-${colorClass}-300 hover:shadow-sm`}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Icon size={14} className={disabled ? 'text-text-subtle' : selected ? `text-${colorClass}-500` : 'text-text-subtle'} />
                    <span className="truncate max-w-[100px]">{selected ? data.find((d: any) => d.id === selected)?.name || title : title}</span>
                </div>
                {!disabled && <ChevronDown size={12} className={`opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isOpen && !disabled && createPortal(
                <div
                    className="fixed-dropdown-menu fixed z-[99999] bg-surface border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1 max-h-80 overflow-y-auto animate-in zoom-in-95 duration-100"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        minWidth: coords.minWidth,
                    }}
                >
                    <div className="sticky top-0 bg-surface p-2 border-b border-border mb-1 z-10">
                        <span className="text-[10px] font-bold uppercase text-text-subtle tracking-widest block mb-1">{title}</span>
                        <input
                            type="text"
                            placeholder={isAr ? 'بحث...' : 'Search...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-subtle text-xs p-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    <button onClick={() => { onSelect(null); setIsOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors ${!selected ? 'bg-surface-subtle text-text-main' : 'hover:bg-surface-subtle text-text-subtle'}`}>
                        {isAr ? 'الكل' : 'All'}
                    </button>

                    {filteredData.length === 0 ? (
                        <div className="text-center p-2 text-[10px] text-text-subtle">No options available</div>
                    ) : (
                        filteredData.map((d: any) => (
                            <button key={d.id} onClick={() => { onSelect(selected === d.id ? null : d.id); setIsOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors break-words ${selected === d.id ? `bg-${colorClass}-50 text-${colorClass}-600` : 'hover:bg-surface-subtle text-text-subtle hover:text-text-main'}`}>
                                {d.name}
                            </button>
                        ))
                    )}
                </div>,
                document.body
            )}
        </>
    );
};

export default SmartDropdown;
