/**
 * OCR Controller powered by Google Gemini (Gemini 2.0 Flash)
 * Used to extract handwritten and printed text from Delivery Notes.
 */
const { log } = require('../../../shared/utils/logger');

const processDeliveryNoteOCR = async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Image base64 is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDckn5GBmg2sxFKVSwefPMGDBPl5hXJflI';
        if (!apiKey) {
            log('[OCR] Error: GEMINI_API_KEY is not configured');
            return res.status(500).json({ error: 'AI Vision is not configured on the server.' });
        }

        log('[OCR] Starting Vision AI analysis for delivery note via Gemini...');

        // Clean base64 and extract mime type if possible
        let base64Data = image;
        let mimeType = 'image/jpeg';
        
        if (image.startsWith('data:')) {
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        const prompt = `You are a highly accurate OCR assistant specialized in Arabic and English handwritten text reading for Waste Management forms (Delivery Notes / Manifests). 
Your ONLY task is to extract data from the provided image and return it in pure JSON format.
There must be NO markdown formatting, NO \`\`\`json blocks, and NO conversational text. Just the strictly valid JSON object.

Extract the following fields if present:
- "delivery_note_no": Look for "No.", "DN", "رقم السند". Return just the number (e.g., "123456").
- "waste_manifest_no": Look for Manifest number if any.
- "date": The date of the trip in YYYY-MM-DD format (if possible) or whatever is written.
- "quantity": (Number only) Look for "الكمية", "الوزن", "Quantity", "QTY", "Weight".
- "unit": (String: TON, KG, CBM)
- "company_name": Client name, "العميل", "الشركة".
- "project_name": Project name, "المشروع", "الموقع".
- "driver_name": Driver's name, "السائق".
- "vehicle_plate": Vehicle Plate number, "رقم اللوحة", "السيارة".
- "service_name": Material type, "النفايات", "نوع المادة", "الخدمة".

If a field is not found or unreadable, set its value to null. Output standard JSON.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 1024,
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            log(`[OCR] External AI Error: ${JSON.stringify(data)}`);
            throw new Error(data.error?.message || 'Failed to process image with AI Vision');
        }

        // Gemini returns the text in candidates[0].content.parts[0].text
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) {
           throw new Error('AI returned an empty response.');
        }

        log(`[OCR] AI Output received: ${rawContent}`);

        // Try to parse the JSON. Since we instructed strictly, it should be clean.
        // We handle potential markdown code blocks just in case.
        let jsonStr = rawContent.trim();
        if (jsonStr.startsWith('\`\`\`json')) {
            jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        } else if (jsonStr.startsWith('\`\`\`')) {
            jsonStr = jsonStr.replace(/\`\`\`/g, '').trim();
        }

        const parsedData = JSON.parse(jsonStr);

        res.json({
            status: 'success',
            extracted: parsedData
        });

    } catch (error) {
        log(`[OCR] Controller Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to extract data' });
    }
};

module.exports = {
    processDeliveryNoteOCR
};

