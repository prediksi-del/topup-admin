import Joi from 'joi';

export const schemas = {
  syncUser: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required()
  }),
  topup: Joi.object({
    amount: Joi.number().integer().min(10000).required()
  }),
  withdraw: Joi.object({
    amount: Joi.number().integer().min(50000).required(),
    bankName: Joi.string().uppercase().required(),
    accountNumber: Joi.string().regex(/^\d+$/).required(),
    accountName: Joi.string().required()
  }),
  approve: Joi.object({
    transactionId: Joi.string().hex().length(24).required(),
    action: Joi.string().valid('approve', 'reject').required()
  })
};

export function validatePayload(body, schema, res) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: 'Validasi input gagal', errors: error.details.map(e => e.message) });
    return null;
  }
  return value;
}
