import { PayOS } from '@payos/node';

export const payos =
  process.env.PAYOS_CLIENT_ID &&
  process.env.PAYOS_API_KEY &&
  process.env.PAYOS_CHECKSUM_KEY
    ? new PayOS({
        clientId: process.env.PAYOS_CLIENT_ID,
        apiKey: process.env.PAYOS_API_KEY,
        checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      })
    : null;

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  );
}
