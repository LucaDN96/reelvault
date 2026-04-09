import { Router } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../services/supabase.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /stripe/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  const profile = req.userProfile;

  if (profile.plan === 'pro') {
    return res.status(400).json({ error: 'Already on Pro plan' });
  }

  let customerId = profile.stripe_customer_id;

  // Create a Stripe customer if one doesn't exist yet
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: { supabase_user_id: profile.id }
    });
    customerId = customer.id;
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', profile.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/app?upgrade=success`,
    cancel_url:  `${process.env.FRONTEND_URL}/app?upgrade=cancel`,
    metadata: { supabase_user_id: profile.id }
  });

  res.json({ url: session.url });
});

// POST /stripe/create-portal-session
router.post('/create-portal-session', async (req, res) => {
  const profile = req.userProfile;

  if (!profile.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer associated with this account' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL}/app`
  });

  res.json({ url: session.url });
});

// POST /stripe/webhook — no auth middleware, raw body required
export function stripeWebhookRouter() {
  const webhookRouter = Router();

  webhookRouter.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        return res.status(400).send(`Webhook error: ${err.message}`);
      }

      const session      = event.data.object;
      const customerId   = session.customer;
      const subscriptionId = session.subscription || session.id;

      switch (event.type) {
        case 'checkout.session.completed': {
          // Payment confirmed — upgrade user to Pro
          const userId = session.metadata?.supabase_user_id;
          if (userId) {
            await supabaseAdmin
              .from('users')
              .update({ plan: 'pro', stripe_subscription_id: subscriptionId })
              .eq('id', userId);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          // Subscription cancelled — downgrade to Free
          const { data: users } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId);

          if (users?.length) {
            await supabaseAdmin
              .from('users')
              .update({ plan: 'free', stripe_subscription_id: null })
              .eq('stripe_customer_id', customerId);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const status = session.status;
          if (status === 'active') {
            await supabaseAdmin
              .from('users')
              .update({ plan: 'pro' })
              .eq('stripe_customer_id', customerId);
          } else if (['canceled', 'unpaid', 'past_due'].includes(status)) {
            await supabaseAdmin
              .from('users')
              .update({ plan: 'free' })
              .eq('stripe_customer_id', customerId);
          }
          break;
        }
      }

      res.json({ received: true });
    }
  );

  return webhookRouter;
}

export default router;
