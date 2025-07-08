import Joi from 'joi';

const schemas = {
  // Авторизация
  sign: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(8).required(),
    meta: Joi.object().optional()
  }),
  
  signup: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
  }),

  // Discord OAuth
  discordCallback: Joi.object({
    code: Joi.string().required()
  }),

  discordCreate: Joi.object({
    meta: Joi.object({
      id: Joi.string().required(),
      conn_id: Joi.number().integer().required()
    }).required()
  }),

  // Подтверждение email
  confirmMail: Joi.object({
    code: Joi.string().length(6).alphanum().required()
  }),

  // Завершение регистрации
  finishRegister: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).optional()
  }),

  // Восстановление пароля
  forgetPasswordRequest: Joi.object({
    mail: Joi.string().email().required()
  }),

  FormMail: Joi.object({
    email: Joi.string().email().required()
  }),

  changeEmail: Joi.object({
    mail: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
  }),

  uploadSkin: Joi.object({
    name: Joi.string().min(1).max(100),
    slim: Joi.boolean().default(false),
    hd: Joi.boolean().default(false)
  }),

  verifyCode: Joi.object({
    code: Joi.string().length(6).alphanum().required(),
    password: Joi.string().min(8).optional()
  }),

  forgetPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    code: Joi.string().length(6).alphanum().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
  })
};

export { schemas };