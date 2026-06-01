import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components';
import { Eraser, Check, X } from 'lucide-react';

interface SignaturePadProps {
    onSave: (signatureBase64: string) => void;
    onCancel: () => void;
    isAr?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel, isAr = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set line style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Responsive canvas size
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = 300;
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.beginPath(); // Reset path
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        setIsEmpty(false);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
        }
    };

    const handleSave = () => {
        if (isEmpty) return;
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL('image/png'));
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border-2 border-primary-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-text-main">{isAr ? 'التوقيع الرقمي للعميل' : 'Digital Client Signature'}</h3>
                <button onClick={onCancel} className="p-2 text-text-subtle hover:text-rose-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="relative bg-white rounded-2xl border-2 border-slate-100 dark:border-slate-800 touch-none overflow-hidden cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[300px]"
                />
                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 flex-col gap-2">
                        <Eraser size={40} className="text-text-subtle" />
                        <p className="text-xs font-bold uppercase tracking-widest">{isAr ? 'وقع هنا' : 'Sign Here'}</p>
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <Button variant="ghost" onClick={clear} className="flex-1 gap-2">
                    <Eraser size={16} /> {isAr ? 'مسح' : 'Clear'}
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={isEmpty} className="flex-2 gap-2 shadow-lg shadow-primary-500/30">
                    <Check size={16} /> {isAr ? 'اعتماد التوقيع' : 'Confirm Signature'}
                </Button>
            </div>
        </div>
    );
};

export default SignaturePad;
