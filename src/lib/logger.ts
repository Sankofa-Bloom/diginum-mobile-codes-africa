import { createLogger } from 'winston';
import { format } from 'winston';
import { transports } from 'winston';
import { json } from 'winston';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = VITE_ENABLE_DEBUG_LOGGING ? 'debug' : 'info';

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp(),
    format.json(),
    format.printf(info => {
      return `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(info => {
          return `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`;
        })
      )
    }),
    new transports.File({ 
      filename: 'error.log', 
      level: 'error',
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    }),
    new transports.File({ 
      filename: 'combined.log',
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    })
  ]
});

export const logPaymentEvent = (type: string, data: any) => {
  logger.info(`Payment Event - ${type}`, {
    ...data,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
};

export const logPaymentError = (type: string, error: any, data: any = {}) => {
  logger.error(`Payment Error - ${type}`, {
    error: {
      message: error.message,
      stack: error.stack,
    },
    ...data,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
};

export const logStripeEvent = (type: string, event: any) => {
  logger.info(`Stripe Event - ${type}`, {
    eventId: event.id,
    eventType: event.type,
    data: event.data,
    timestamp: event.created * 1000, // Stripe timestamps are in seconds
    environment: process.env.NODE_ENV,
  });
};

export const logStripeWebhook = (type: string, data: any) => {
  logger.info(`Stripe Webhook - ${type}`, {
    ...data,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
};
