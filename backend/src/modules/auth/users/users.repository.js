const { and, asc, eq, ne, or, sql } = require('drizzle-orm');
const { db } = require('../../../shared/db/drizzle/client');
const { users } = require('../../../shared/db/drizzle/schema');

const toApiUser = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    avatar: row.avatar,
    company_id: row.companyId,
    project_id: row.projectId,
    supplier_id: row.supplierId,
    created_at: row.createdAt,
    last_login: row.lastLogin,
    status: row.status,
    preferences: row.preferences,
});

const toDrizzleUserPatch = (payload) => {
    const mapped = {};
    if (payload.id !== undefined) mapped.id = payload.id;
    if (payload.name !== undefined) mapped.name = payload.name;
    if (payload.email !== undefined) mapped.email = payload.email;
    if (payload.password !== undefined) mapped.password = payload.password;
    if (payload.role !== undefined) mapped.role = payload.role;
    if (payload.avatar !== undefined) mapped.avatar = payload.avatar;
    if (payload.company_id !== undefined) mapped.companyId = payload.company_id;
    if (payload.project_id !== undefined) mapped.projectId = payload.project_id;
    if (payload.supplier_id !== undefined) mapped.supplierId = payload.supplier_id;
    if (payload.created_at !== undefined) mapped.createdAt = payload.created_at;
    if (payload.last_login !== undefined) mapped.lastLogin = payload.last_login;
    if (payload.status !== undefined) mapped.status = payload.status;
    if (payload.preferences !== undefined) mapped.preferences = payload.preferences;
    return mapped;
};

const listActiveUsers = async () => {
    const rows = await db
        .select()
        .from(users)
        .where(or(ne(users.role, 'DEACTIVATED'), sql`${users.role} IS NULL`))
        .orderBy(asc(users.id));

    return rows.map(toApiUser);
};

const existsById = async (id) => {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    return rows.length > 0;
};

const hasDuplicateEmail = async (email, currentId) => {
    const duplicateRows = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                sql`lower(${users.email}) = lower(${email})`,
                currentId ? ne(users.id, currentId) : sql`true`
            )
        )
        .limit(1);

    return duplicateRows.length > 0;
};

const createUser = async (payload) => {
    await db.insert(users).values(toDrizzleUserPatch(payload));
};

const updateUser = async (id, payload) => {
    await db.update(users).set(toDrizzleUserPatch(payload)).where(eq(users.id, id));
};

const findById = async (id) => {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? toApiUser(rows[0]) : null;
};

module.exports = {
    listActiveUsers,
    existsById,
    hasDuplicateEmail,
    createUser,
    updateUser,
    findById,
};
