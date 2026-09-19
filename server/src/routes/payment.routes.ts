import express, { Router } from 'express';
import { createCheckout, readCheckoutStatus, readPricing, receiveWhopWebhook } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { checkoutLimiter, reportReadLimiter } from '../middleware/rate-limits.js';

export const paymentWebhookRouter = Router();
paymentWebhookRouter.post('/whop', express.raw({ type: 'application/json', limit: '256kb' }), receiveWhopWebhook);

export const paymentRouter = Router();
paymentRouter.get('/pricing', reportReadLimiter, readPricing);
paymentRouter.post('/checkout', checkoutLimiter, requireAuth, createCheckout);
paymentRouter.get('/checkout/:id', reportReadLimiter, requireAuth, readCheckoutStatus);
