import type { Prisma } from '@prisma/client'

/** Allocate the next ticket number for a tenant inside a transaction. */
export async function allocateTicketNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<number> {
  const counter = await tx.tenantSaleCounter.upsert({
    where: { tenantId },
    create: { tenantId, nextTicketNumber: 2 },
    update: { nextTicketNumber: { increment: 1 } },
    select: { nextTicketNumber: true },
  })
  return counter.nextTicketNumber - 1
}
