import { createLogger } from 'winston';
import { format } from 'winston';
import { transports } from 'winston';
import { json } from 'winston';

const { combine, timestamp, printf } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
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
