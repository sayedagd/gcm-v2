const buildValidationError = ({
    code,
    errorEn,
    errorAr,
    field,
    details,
}) => {
    const payload = {
        status: 'fail',
        code,
        errorEn,
        errorAr,
    };

    if (field) {
        payload.field = field;
    }

    if (Array.isArray(details) && details.length > 0) {
        payload.details = details;
    }

    return payload;
};

module.exports = {
    buildValidationError,
};
