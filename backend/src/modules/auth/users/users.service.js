const bcrypt = require('bcryptjs');
const validators = require('../../../../validators');
const { duplicateEntity, translateJoiErrors } = require('../../../shared/utils/bilingualErrors');
const { logActivity } = require('../../../shared/services/activityService');
const usersRepository = require('./users.repository');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

const createHttpError = (status, body) => {
    const error = new Error(body.errorEn || body.errorAr || 'Request failed');
    error.status = status;
    error.body = body;
    return error;
};

const isBcryptHash = (value) => typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);

const hashPasswordIfNeeded = async (password) => {
    if (typeof password !== 'string' || password.length === 0) return password;
    if (password === 'DELETED_USER_ACCESS_REVOKED' || isBcryptHash(password)) return password;
    return bcrypt.hash(password, BCRYPT_ROUNDS);
};

const listUsers = async () => usersRepository.listActiveUsers();

const upsertUser = async ({ payload, actorUserId }) => {
    if (validators.users) {
        const { error } = validators.users.validate(payload, { abortEarly: false });
        if (error) {
            const translated = translateJoiErrors(error.details);
            const first = translated[0] || {};
            throw createHttpError(400, {
                error: error.details[0].message,
                errorAr: first.errorAr || 'بيانات غير صالحة',
                errorEn: first.errorEn || 'Invalid data',
                code: first.code || 'VALIDATION',
                field: first.field,
                allErrors: translated,
            });
        }
    }

    const enriched = { ...payload };
    if (!enriched.id) {
        enriched.id = `USER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    if (typeof enriched.password === 'string') {
        enriched.password = await hashPasswordIfNeeded(enriched.password);
    }

    const isUpdate = await usersRepository.existsById(enriched.id);

    if (enriched.email) {
        const hasDuplicate = await usersRepository.hasDuplicateEmail(enriched.email, isUpdate ? enriched.id : null);
        if (hasDuplicate) {
            throw createHttpError(409, duplicateEntity('users', enriched.email));
        }
    }

    if (isUpdate) {
        await usersRepository.updateUser(enriched.id, enriched);
    } else {
        await usersRepository.createUser(enriched);
    }

    const record = (await usersRepository.findById(enriched.id)) || enriched;

    await logActivity({
        user_id: actorUserId,
        action: isUpdate ? 'UPDATE' : 'CREATE',
        entity_type: 'users',
        entity_id: enriched.id,
        details: JSON.stringify(record),
    });

    return { status: 'success', id: enriched.id, ...record };
};

module.exports = {
    listUsers,
    upsertUser,
};
