/**
 * GCM AI Assistant Controller (Shadi)
 */
const { query } = require('../../../database');
const { log } = require('../utils/logger');

const logSession = async (req, res) => {
    try {
        const data = req.body;
        const id = `AIS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const startedAt = data.started_at || new Date().toISOString();
        const endedAt = data.ended_at || new Date().toISOString();
        const duration = data.duration_seconds || Math.round((new Date(endedAt) - new Date(startedAt)) / 1000);

        await query(
            `INSERT INTO ai_sessions (id, user_id, user_name, user_role, action_type, language, status, started_at, ended_at, duration_seconds, trip_reference, error_message, trip_data_summary, ai_confidence_score, ip_address)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
            [id, data.user_id, data.user_name, data.role || data.user_role, data.action_type || 'general',
                data.language || 'ar', data.status || 'completed', startedAt, endedAt, duration,
                data.trip_reference || null, data.error_message || null,
                data.trip_data_summary ? JSON.stringify(data.trip_data_summary) : null,
                data.ai_confidence_score || null, req.ip || null]
        );

        log(`[AI] Session logged: ${id} | User: ${data.user_name} | Action: ${data.action_type} | Status: ${data.status}`);
        res.json({ status: 'success', session_id: id });
    } catch (e) {
        log(`[AI] Log session error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

const getSessions = async (req, res) => {
    try {
        const { user_id, status, action_type, language, from, to, page = 1, limit = 25 } = req.query;
        const conditions = [];
        const params = [];
        let paramIdx = 1;

        if (user_id) { conditions.push(`user_id = $${paramIdx++}`); params.push(user_id); }
        if (status) { conditions.push(`status = $${paramIdx++}`); params.push(status); }
        if (action_type) { conditions.push(`action_type = $${paramIdx++}`); params.push(action_type); }
        if (language) { conditions.push(`language = $${paramIdx++}`); params.push(language); }
        if (from) { conditions.push(`started_at >= $${paramIdx++}`); params.push(from); }
        if (to) { conditions.push(`started_at <= $${paramIdx++}`); params.push(to); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const countResult = await query(`SELECT COUNT(*) FROM ai_sessions ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT * FROM ai_sessions ${where} ORDER BY started_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
            [...params, parseInt(limit), offset]
        );

        res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
    } catch (e) {
        log(`[AI] List sessions error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

const getSessionDetails = async (req, res) => {
    try {
        const session = await query('SELECT * FROM ai_sessions WHERE id = $1', [req.params.id]);
        if (session.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

        const messages = await query('SELECT * FROM ai_messages WHERE session_id = $1 ORDER BY timestamp ASC', [req.params.id]);
        res.json({ ...session.rows[0], messages: messages.rows });
    } catch (e) {
        log(`[AI] Session detail error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const [totals, byAction, byStatus, topUsers, avgDuration, recentErrors] = await Promise.all([
            query('SELECT COUNT(*) as total FROM ai_sessions'),
            query('SELECT action_type, COUNT(*) as count FROM ai_sessions GROUP BY action_type ORDER BY count DESC'),
            query('SELECT status, COUNT(*) as count FROM ai_sessions GROUP BY status ORDER BY count DESC'),
            query('SELECT user_name, user_role, COUNT(*) as session_count FROM ai_sessions GROUP BY user_name, user_role ORDER BY session_count DESC LIMIT 5'),
            query('SELECT ROUND(AVG(duration_seconds)) as avg_duration FROM ai_sessions WHERE duration_seconds > 0'),
            query("SELECT error_message, COUNT(*) as count FROM ai_sessions WHERE error_message IS NOT NULL AND error_message != '' GROUP BY error_message ORDER BY count DESC LIMIT 5")
        ]);

        const total = parseInt(totals.rows[0].total);
        const successCount = byStatus.rows.find(r => r.status === 'completed')?.count || 0;
        const successRate = total > 0 ? Math.round((parseInt(successCount) / total) * 100) : 0;

        res.json({
            total_sessions: total,
            success_rate: successRate,
            avg_duration_seconds: parseInt(avgDuration.rows[0]?.avg_duration || 0),
            by_action_type: byAction.rows,
            by_status: byStatus.rows,
            top_users: topUsers.rows,
            common_errors: recentErrors.rows
        });
    } catch (e) {
        log(`[AI] Analytics error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

const rateSession = async (req, res) => {
    try {
        const { rating, flagged } = req.body;
        const updates = [];
        const params = [req.params.id];
        let idx = 2;

        if (rating !== undefined) { updates.push(`rating = $${idx++}`); params.push(rating); }
        if (flagged !== undefined) { updates.push(`flagged = $${idx++}`); params.push(flagged); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        await query(`UPDATE ai_sessions SET ${updates.join(', ')} WHERE id = $1`, params);
        res.json({ status: 'updated' });
    } catch (e) {
        log(`[AI] Rate session error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

const chatProxy = async (req, res) => {
    try {
        const { messages, context } = req.body;
        const GROQ_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_KEY) {
            log(`[AI/Critical] GROQ_API_KEY is missing from environment variables`);
            return res.status(500).json({ error: 'AI Assistant is not configured on the server. Please check environment variables.' });
        }

        log(`[AI/Debug] Prompting Shady with ${messages?.length || 0} messages`);

        const systemPrompt = `أنت "شادي" (Shady)، المساعد الذكي الرسمي لنظام GCM (الرسالة الواضحة العالمية - Global Clear Mission) لإدارة النفايات والخدمات البيئية.

## هويتك وشخصيتك:
- أنت خبير في نظام GCM ومستشار للمستخدمين.
- اسم الشركة: الرسالة الواضحة العالمية (Global Clear Mission).
- مقر الشركة الرئيسي: دول الخليج (GCM Gulf).
- أسلوبك: محترف، ودود، وواضح. يمكنك إجراء محادثات شخصية خفيفة (مثل التحية أو السؤال عن الحال) ولكن في سياق العمل دائماً.
- إذا سُئلت عن أي شخص بالشركة أو طلب المستخدم التواصل مع الإدارة، وجهه لاستخدام الإيميل الرسمي: info@gcm-gulf.com.

## صلاحيات المستخدم (RBAC) - هامة جداً:
بناءً على دور المستخدم (\`context.current_user.role\`)، يجب أن تتصرف كالتالي:
1. **SUPER_ADMIN / ADMIN / REPORTS_MANAGER**: لديه كامل الصلاحيات لعمل كل شيء في النظام (إنشاء، تعديل، حذف، تقارير، إدارة مستخدمين).
2. **COMPANY_USER**: يمكنه رؤية وإدارة بيانات شركته فقط. لا تعطِهِ معلومات عن شركات أخرى. ساعده في الرحلات والتقارير الخاصة بمنشآته.
3. **PROJECT_USER**: يمكنه رؤية وإدارة بيانات مشروعه فقط. لا تعطِهِ معلومات عن مشاريع أخرى حتى لو كانت لنفس الشركة.
4. **DRIVER / VEHICLE_OPERATOR**: ساعده فقط في المهام المتعلقة بتسجيل الرحلات وحالة المركبة.

## دورك التقني:
- الإجابة على أسئلة المستخدمين حول النظام.
- مساعدة المستخدمين في فهم الوظائف المتاحة.
- استخراج بيانات الرحلات من النص لتبسيط التسجيل.
- بناءً على السياق (\`context\`)، قدم معلومات دقيقة ومحدثة.

## قواعد اللغة ومنع الهلوسة:
- **اللغة**: يجب أن تتحدث باللغة **العربية** دائماً وتكون إجابتك باللغة العربية حصراً حتى لو كان السؤال باللغة الإنجليزية، إلا إذا طلب منك المستخدم صراحةً التحدث باللغة الإنجليزية. يُمنع استخدام أي لغات أخرى.
- **الصدق**: إذا كانت البيانات ناقصة في السياق (\`context\`)، لا تخترع بيانات. اطلب التوضيح.

## البيانات المتاحة في النظام (Context):
${context ? JSON.stringify(context, null, 0) : 'لا توجد بيانات سياق'}

## المطلوب منك دائماً:
يجب أن يكون ردك عبارة عن كائن JSON **فقط** (بدون أي نص Markdown إضافي) بالصيغة التالية:
{
  "reply": "نص الرد الذي سيظهر للمستخدم. (استخدم هذا الميدان للإجابة النصية الجذابة)",
  "intent": "TRIP_REGISTRATION" | "GENERAL_CHAT" | "NAVIGATION" | "REPORT_EXPORT" | "FACILITY_ONBOARDING" | "DATA_QUERY",
  "trip_data": { "company_id": "...", "project_id": "...", "service_id": "...", "quantity": 5, "vehicle_id": "...", "driver_id": "..." },
  "query_filters": { "company_id": "...", "project_id": "...", "status": "COMPLETED" },
  "next_step": "FIELD_NAME_TO_ASK_FOR" | "confirmation" | null
}

## قواعد الاستعلام عن البيانات (DATA_QUERY):
1. إذا سأل المستخدم أسئلة إحصائية مثل "كم عدد الرحلات لمتجر كذا؟" أو "ما هو إجمالي حمولة مشروع كذا؟"، لا تحاول اختراع إجابة. اجعل الـ \`intent\`: "DATA_QUERY".
2. قم بتضمين المعرفات المطلوبة في \`query_filters\` (مثل: \`company_id\`, \`project_id\`) لكي يقوم الـ Frontend بحسابها نيابة عنك وعرضها.
3. في الـ \`reply\`، قل شيئاً مثل: "جاري حساب البيانات المطلوبة...".

## قواعد استخراج بيانات الرحلة بذكاء (TRIP_REGISTRATION):
1. إذا قدم المستخدم كافة المعلومات الأساسية في جملة واحدة (الشركة، المشروع، الخدمة، الكمية، المركبة، والسائق)، لا تسأله خطوة بخطوة! بل استخرج جميع المعرفات (IDs) في \`trip_data\` وضع حقل \`next_step\` على \`"confirmation"\` فوراً لتخطي الأسئلة.
2. اطلب الحقول الناقصة بالترتيب المنطقي: الملكية (Internal/Supplier) -> الشركة -> المشروع -> الخدمة -> الكمية -> المركبة/السائق -> المرفق.
3. لا تطلب حقولاً لديه صلاحية الوصول إليها تلقائياً (مثل \`company_id\` للـ \`COMPANY_USER\`).
4. **المرفق (Facility)**: اختر المرفق من القائمة المتاحة فقط (\`context.facilities\`) بناءً على توافق الخدمة.`;

        const groqMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        const groqRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
                'X-Title': 'GCM ERP' // Required by OpenRouter
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct',
                messages: groqMessages,
                temperature: 0.4,
                max_tokens: 1024
            })
        });

        if (!groqRes.ok) {
            const err = await groqRes.text();
            log(`[AI Chat] OpenRouter error: ${err}`);
            return res.status(502).json({ error: 'AI service error' });
        }

        const data = await groqRes.json();
        const reply = data.choices?.[0]?.message?.content || '';
        res.json({ reply, usage: data.usage });
    } catch (e) {
        log(`[AI Chat] Error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    logSession,
    getSessions,
    getSessionDetails,
    getAnalytics,
    rateSession,
    chatProxy
};
