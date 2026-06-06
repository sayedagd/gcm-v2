
/**
 * [AR] مكتبة التعامل مع ملفات CSV
 * [EN] CSV Handling Utility Library
 * 
 * [AR] توفر هذه المكتبة وظائف قابلة لإعادة الاستخدام لتصدير واستيراد ملفات CSV
 * [EN] This library provides reusable functions for exporting and importing CSV files
 * 
 * Features:
 * - UTF-8 BOM support for Arabic characters (Excel compatibility)
 * - Type-safe data mapping
 * - Automatic file download triggering
 * - Robust parsing with error handling
 */

// import { saveAs } from 'file-saver'; // Removed unused import to fix missing module error

/**
 * [AR] تصدير البيانات إلى ملف CSV
 * [EN] Export data to a CSV file
 * 
 * @param filename [AR] اسم الملف الناتج - [EN] Output filename
 * @param headers [AR] عناوين الأعمدة - [EN] Column headers
 * @param data [AR] مصفوفة البيانات - [EN] Data array
 * @param mapper [AR] دالة تحويل العنصر إلى صف - [EN] Function to map item to row
 */
export const exportToCSV = <T,>(
    filename: string,
    headers: string[],
    data: T[],
    mapper: (item: T) => (string | number | undefined | null)[]
): void => {
    // [AR] إضافة BOM لدعم اللغة العربية في Excel
    // [EN] Add UTF-8 BOM for Arabic support in Excel
    const BOM = "\uFEFF";

    const csvContent =
        BOM +
        [
            headers.join(','),
            ...data.map(item =>
                mapper(item).map(field => {
                    // [AR] معالجة الحقول التي تحتوي على فواصل أو أسطر جديدة
                    // [EN] Handle fields containing commas or newlines
                    const str = String(field || '').replace(/"/g, '""');
                    return `"${str}"`;
                }).join(',')
            )
        ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // [AR] إنشاء رابط تنزيل وهمي والنقر عليه
    // [EN] Create dummy download link and click it
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename.endsWith('.csv') ? filename : `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * [AR] تحميل نموذج فارغ (تيمبليت)
 * [EN] Download an empty template CSV
 * 
 * @param filename [AR] اسم الملف - [EN] Filename
 * @param headers [AR] عناوين الأعمدة - [EN] Column headers
 */
export const downloadCSVTemplate = (filename: string, headers: string[]): void => {
    exportToCSV(filename, headers, [], () => []);
};

/**
 * [AR] قراءة ملف CSV وتحويله إلى مصفوفة
 * [EN] Parse CSV file to array
 * 
 * @param file [AR] الملف المرفوع - [EN] Uploaded file
 * @returns [AR] وعد يرجع مصفوفة من الكائنات - [EN] Promise resolving to array of objects
 */
export const parseCSV = (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                // [AR] تقسيم النص إلى أسطر وتجاهل الأسطر الفارغة
                // [EN] Split text into lines and ignore empty lines
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');

                // [AR] تجاهل BOM إذا وجد في السطر الأول
                // [EN] Ignore BOM if present in first line
                const firstLine = lines[0];
                if (firstLine && firstLine.charCodeAt(0) === 0xFEFF) {
                    lines[0] = firstLine.slice(1);
                }

                const data: string[][] = lines.map(line => {
                    // [AR] تقسيم السطر بالفاصلة (مع مراعاة علامات التنصيص - تبسيط للحالة العامة)
                    // [EN] Split line by comma (respecting quotes - simplified for general case)
                    // Note: A full CSV parser regex is complex, for this scope a simple split is often sufficient 
                    // unless complex quoted data is expected. We will use a slightly robust split.
                    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                    // Fallback to simple split if regex fails or for simple CSVs
                    return matches ? matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"')) : line.split(',');
                });

                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};
