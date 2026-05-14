import Joi from 'joi';

export const schemas = {
  // Auth schemas
  signup: Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8),
    university: Joi.string().required(),
    facebook: Joi.string().optional().allow(null),
    instagram: Joi.string().optional().allow(null),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // User schemas
  updateProfile: Joi.object({
    name: Joi.string().optional().min(2).max(100),
    facebook: Joi.string().optional().allow(null),
    instagram: Joi.string().optional().allow(null),
  }),

  // Circle schemas
  createCircle: Joi.object({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().optional().max(500).allow(''),
    type: Joi.string().valid('university', 'private').required(),
    inviteeIds: Joi.array().items(Joi.string().uuid()).min(2).required(),
    locationId: Joi.string().optional().allow(null),
    isOpen: Joi.boolean().optional().default(false),
    boundary: Joi.array().items(Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required()
    })).optional().allow(null),
    snapshotBase64: Joi.string().optional().allow(null),
  }),

  updateCircle: Joi.object({
    name: Joi.string().optional().min(2).max(100),
    description: Joi.string().optional().max(500).allow(''),
    isOpen: Joi.boolean().optional(),
  }),

  // Location schemas
  updateLocation: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    accuracy: Joi.number().required(),
    isInside: Joi.boolean().required(),
  }),

  // Friend request schemas
  addFriend: Joi.object({
    email: Joi.string().email().required(),
  }),

  // Watch request schemas
  watchFriend: Joi.object({
    friendId: Joi.string().required(),
    scope: Joi.string().valid('campus', 'all').required(),
  }),
};

export const validate = (data, schema) => {
  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};
