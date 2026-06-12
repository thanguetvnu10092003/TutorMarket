import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { country = 'VN', bankName, accountNumber, accountName, bankBranch,
          swiftCode, iban, routingNumber, isPrimary = true } = body;

  if (country === 'VN') {
    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'Bank name, account number, and account name are required for VN accounts' }, { status: 400 });
    }
  } else {
    if (!accountName) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }
  }

  if (isPrimary) {
    await prisma.bankAccount.updateMany({ where: { userId }, data: { isPrimary: false } });
  }

  const account = await prisma.bankAccount.create({
    data: { userId, country, bankName, accountNumber, accountName, bankBranch,
            swiftCode, iban, routingNumber, isPrimary },
  });
  return NextResponse.json({ account }, { status: 201 });
}
