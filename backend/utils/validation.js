const { z } = require('zod');

// Common schemas
const idSchema = z.string().min(1);
const symbolSchema = z.string().min(1).max(20);
const sideSchema = z.enum(['buy', 'sell']);

// Example: trade execution payload
const executeTradeSchema = z.object({
  botId: idSchema,
  symbol: symbolSchema,
  side: sideSchema,
  quantity: z.number().positive(),
  price: z.number().optional(),
  order_type: z.enum(['market', 'limit', 'stop', 'stop_limit']).default('market')
});

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'trader', 'viewer']).optional()
});

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8)
}).refine((data) => !!data.username || !!data.email, {
  message: 'Either username or email must be provided'
});

const paperOrderSchema = z.object({
  symbol: symbolSchema,
  side: sideSchema,
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  quantity: z.number().positive(),
  price: z.number().nullable().optional(),
  stopPrice: z.number().nullable().optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional()
});

const validate = (schema) => (req, res, next) => {
  try {
    req.validated = schema.parse(req.body);
    next();
  } catch (e) {
    return res.status(400).json({ error: e.errors?.map(er => er.message).join(', ') || 'Invalid payload' });
  }
};

module.exports = {
  z,
  validate,
  schemas: {
    executeTradeSchema,
    registerSchema,
    loginSchema,
    paperOrderSchema
  }
};
