
import { getPrismaClient } from '../persistence/prisma-client';

async function checkDb() {
  const prisma = getPrismaClient();
  try {
    const snapshots = await prisma.weeklySnapshot.findMany();
    console.log('Weekly Snapshots:', snapshots.length);
    if (snapshots.length > 0) {
      console.log('Latest Snapshot:', JSON.stringify(snapshots[0], null, 2));
    }

    const tickets = await prisma.ticketSnapshot.count();
    console.log('Total Tickets in DB:', tickets);

    const rftSnapshots = await prisma.rftSnapshot.findMany();
    console.log('RFT Snapshots:', rftSnapshots.length);
  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
