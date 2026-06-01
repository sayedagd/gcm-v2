/**
 * =====================================================
 * [AR] أدوات التصدير والاستيراد - Excel Utilities
 * [EN] Excel Export/Import Utilities
 * =====================================================
 */

import * as XLSX from 'xlsx';

/**
 * [AR] تصدير البيانات إلى ملف Excel
 * [EN] Export data to Excel file
 */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1'
) => {
  try {
    // [AR] تبسيط البيانات المعقدة والحد من طول النص - [EN] Flatten complex data and limit text length
    const flattenedData = data.map(item => {
      const cleaned: any = {};
      Object.entries(item).forEach(([key, value]) => {
        let val = value;
        if (val !== null && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        if (typeof val === 'string' && val.length > 32700) {
          val = val.substring(0, 32700) + '... [TRUNCATED]';
        }
        cleaned[key] = val;
      });
      return cleaned;
    });

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `${filename}.xlsx`);

    return true;
  } catch (error) {
    console.error('[Excel Export] Failed:', error);
    return false;
  }
};

/**
 * [AR] تصدير جداول متعددة إلى ملف Excel واحد (أوراق عمل متعددة)
 * [EN] Export multiple tables to a single Excel file (multiple sheets)
 */
export const exportMultiSheetExcel = (
  tables: Record<string, any[]>,
  filename: string
) => {
  try {
    const workbook = XLSX.utils.book_new();

    Object.entries(tables).forEach(([sheetName, data]) => {
      if (data && Array.isArray(data) && data.length > 0) {
        // [AR] تبسيط البيانات المعقدة (Objects/Arrays) إلى نصوص لتجنب مشاكل Excel
        // [EN] Flatten complex data (Objects/Arrays) to strings for Excel compatibility
        const flattenedData = data.map(item => {
          const cleaned: any = {};
          Object.entries(item).forEach(([key, value]) => {
            let val = value;
            if (val !== null && typeof val === 'object') {
              val = JSON.stringify(val);
            }

            // [AR] تقليص النص إذا تجاوز الحد المسموح به في Excel (32,767 حرف)
            // [EN] Truncate text if it exceeds Excel's limit (32,767 characters)
            if (typeof val === 'string' && val.length > 32700) {
              val = val.substring(0, 32700) + '... [TRUNCATED DUE TO EXCEL LIMIT]';
            }

            cleaned[key] = val;
          });
          return cleaned;
        });

        const worksheet = XLSX.utils.json_to_sheet(flattenedData);
        // Valid sheet names cannot exceed 31 chars and cannot contain certain chars
        const safeName = sheetName.substring(0, 31).replace(/[\[\]\?\*\/\\\:]/g, '_');
        XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
      }
    });

    if (workbook.SheetNames.length === 0) {
      console.warn('[Excel Export] No data to export');
      return false;
    }

    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error('[Excel Multi-Sheet Export] Failed:', error);
    return false;
  }
};

/**
 * [AR] استيراد البيانات من ملف Excel
 * [EN] Import data from Excel file
 */
export const importFromExcel = <T = any>(
  file: File
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<T>(worksheet);

        resolve(jsonData);
      } catch (error) {
        console.error('[Excel Import] Failed:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error('[Excel Import] File read error:', error);
      reject(error);
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * [AR] تصدير قالب فارغ (Template)
 * [EN] Export empty template with headers
 */
export const exportTemplate = (
  headers: string[],
  filename: string,
  sheetName: string = 'Template'
) => {
  try {
    // Create empty row with headers
    const emptyData = [headers.reduce((acc, header) => {
      acc[header] = '';
      return acc;
    }, {} as Record<string, string>)];

    const worksheet = XLSX.utils.json_to_sheet(emptyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, `${filename}_template.xlsx`);

    return true;
  } catch (error) {
    console.error('[Excel Template] Failed:', error);
    return false;
  }
};

/**
 * [AR] تنظيف البيانات قبل التصدير (إزالة الحقول غير المطلوبة)
 * [EN] Clean data before export (remove unwanted fields)
 */
export const cleanDataForExport = <T extends Record<string, any>>(
  data: T[],
  excludeFields: string[] = []
): Partial<T>[] => {
  return data.map(item => {
    const cleaned = { ...item };
    excludeFields.forEach(field => {
      delete cleaned[field];
    });
    return cleaned;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Schema-Driven Excel Engine
// [AR] محرك Excel المعتمد على المخططات — يعمل أوتوماتيك مع أي تعديل في النوع
// [EN] Schema-driven engine — automatically adapts to any type update
// ─────────────────────────────────────────────────────────────────────────────

import type { ExcelSchema } from './excelSchemas';

/**
 * [EN] Export a list of entities using an ExcelSchema definition.
 *      Every column in the schema is emitted automatically.
 *      exportTransform() is called when present to format the value.
 *
 * [AR] تصدير قائمة كيانات بناءً على تعريف الـ schema.
 *      كل عمود معرّف في الـ schema يُصدَّر تلقائياً دون تعديل في أي صفحة.
 */
export const exportFromSchema = <T extends Record<string, any>>(
  entities: T[],
  schema: ExcelSchema<T>,
  filename: string,
  sheetName?: string
): boolean => {
  try {
    const exportCols = schema.columns.filter(c => !c.importOnly);

    const rows = entities.map(entity => {
      const row: Record<string, any> = {};
      for (const col of exportCols) {
        const rawValue = entity[col.field as keyof T];
        const value = col.exportTransform
          ? col.exportTransform(rawValue, entity)
          : rawValue ?? '';

        // Truncate to Excel's 32,767 char limit
        row[col.header] =
          typeof value === 'string' && value.length > 32700
            ? value.substring(0, 32700) + '... [TRUNCATED]'
            : value ?? '';
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const safeName = (sheetName || schema.entityName).substring(0, 31).replace(/[\[\]?*\/\\:]/g, '_');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error(`[Excel Schema Export] Failed for ${schema.entityName}:`, error);
    return false;
  }
};

/**
 * [EN] Export an empty template using an ExcelSchema definition.
 *      The header row is derived from all non-exportOnly columns.
 *      Required columns are marked with an asterisk (*).
 *
 * [AR] تصدير قالب فارغ بناءً على تعريف الـ schema.
 *      الأعمدة المطلوبة تُعلَّم بنجمة (*) في الهيدر.
 */
export const exportTemplateFromSchema = <T,>(
  schema: ExcelSchema<T>,
  filename: string,
  sheetName?: string
): boolean => {
  try {
    const templateCols = schema.columns.filter(c => !c.exportOnly);

    const headerRow: Record<string, string> = {};
    for (const col of templateCols) {
      const label = col.required ? `${col.header} *` : col.header;
      headerRow[label] = col.default !== undefined ? String(col.default) : '';
    }

    const worksheet = XLSX.utils.json_to_sheet([headerRow]);
    const workbook = XLSX.utils.book_new();
    const safeName = (sheetName || schema.entityName).substring(0, 31).replace(/[\[\]?*\/\\:]/g, '_');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
    XLSX.writeFile(workbook, `${filename}_template.xlsx`);
    return true;
  } catch (error) {
    console.error(`[Excel Schema Template] Failed for ${schema.entityName}:`, error);
    return false;
  }
};

/**
 * [EN] Import entities from an Excel file using an ExcelSchema definition.
 *      Returns import statistics: added, updated, unchanged, failed counts.
 *      Handles required-field validation, transforms, and identity checks.
 *
 * [AR] استيراد كيانات من ملف Excel بناءً على تعريف الـ schema.
 *      يُعيد إحصائيات الاستيراد: مضاف، محدَّث، متطابق، فاشل.
 */
export const importFromSchema = async <T extends Record<string, any>>(
  file: File,
  schema: ExcelSchema<T>,
  existing: T[],
  upsert: (entity: T) => Promise<void> | void
): Promise<{ added: number; updated: number; unchanged: number; failed: number }> => {
  const stats = { added: 0, updated: 0, unchanged: 0, failed: 0 };

  const rawRows = await importFromExcel<Record<string, any>>(file);

  for (const row of rawRows) {
    try {
      // Map Excel headers → entity fields using the schema columns
      const mapped: Partial<T> = {};
      for (const col of schema.columns) {
        // Support both "Header *" (required marker) and plain "Header"
        const rawVal =
          row[col.header] ??
          row[`${col.header} *`] ??
          undefined;

        // Check required fields
        if (col.required && (rawVal === undefined || rawVal === null || rawVal === '')) {
          throw new Error(`Missing required field: ${col.header}`);
        }

        const value = col.transform
          ? col.transform(rawVal ?? col.default, row)
          : rawVal ?? col.default;

        // Skip virtual "_doc_*" sentinel fields — they are handled in buildEntity
        if (!String(col.field).startsWith('_doc_')) {
          (mapped as any)[col.field] = value;
        }
      }

      const entity = schema.buildEntity(mapped, row);
      const idValue = entity[schema.idField];
      const existingRecord = idValue
        ? existing.find(e => e[schema.idField] === idValue)
        : undefined;

      if (existingRecord) {
        if (schema.isUnchanged?.(existingRecord, mapped)) {
          stats.unchanged++;
          continue;
        }
        stats.updated++;
      } else {
        stats.added++;
      }

      // Bypass strict Joi validation constraints on Excel imports to allow partial datasets
      await (upsert as any)(entity, true);
    } catch {
      stats.failed++;
    }
  }

  return stats;
};
