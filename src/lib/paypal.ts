import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

const configureEnvironment = function () {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'test';

  // For testing in development, we use the SandboxEnvironment
  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
};

export const paypalClient = function () {
  return new checkoutNodeJssdk.core.PayPalHttpClient(configureEnvironment());
};
