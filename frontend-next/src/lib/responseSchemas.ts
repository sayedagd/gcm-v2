const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isStringField = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

const validateArrayShape = <T>(
  value: T,
  requiredField: string,
  endpoint: string,
): T => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid response for ${endpoint}: expected array`);
  }

  for (const item of value) {
    if (!isObject(item) || !isStringField(item[requiredField])) {
      throw new Error(`Invalid response for ${endpoint}: missing ${requiredField}`);
    }
  }

  return value;
};

export const validateCriticalApiResponse = <T>(endpoint: string, value: T): T => {
  if (endpoint === '/api/v1/companies') {
    return validateArrayShape(value, 'company_id', endpoint);
  }

  if (endpoint === '/api/v1/projects') {
    return validateArrayShape(value, 'project_id', endpoint);
  }

  if (endpoint === '/api/v1/trips') {
    return validateArrayShape(value, 'trip_id', endpoint);
  }

  if (endpoint === '/api/v1/users') {
    return validateArrayShape(value, 'id', endpoint);
  }

  return value;
};
