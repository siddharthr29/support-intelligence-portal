const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database tables...\n');
    
    const tables = [
      { name: 'WeeklySnapshot', model: prisma.weeklySnapshot },
      { name: 'TicketSnapshot', model: prisma.ticketSnapshot },
      { name: 'RftSnapshot', model: prisma.rftSnapshot },
      { name: 'YtdTickets', model: prisma.ytdTickets },
      { name: 'GroupResolution', model: prisma.groupResolution },
      { name: 'EngineerHours', model: prisma.engineerHours },
      { name: 'Notes', model: prisma.notes },
      { name: 'JobExecution', model: prisma.jobExecution },
      { name: 'SyncPerformanceSnapshot', model: prisma.syncPerformanceSnapshot },
    ];
    
    for (const table of tables) {
      try {
        const count = await table.model.count();
        console.log(`${table.name}: ${count} records`);
      } catch (error) {
        console.log(`${table.name}: ERROR - ${error.message}`);
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
