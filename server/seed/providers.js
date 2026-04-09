import prisma from '../db.js';
import { defaultProviders as providers } from './providersData.js';

async function seed() {
  for (const provider of providers) {
    const existing = await prisma.marketplaceProvider.findFirst({
      where: {
        name: provider.name,
        category: provider.category,
      },
    });

    if (existing) {
      continue;
    }

    await prisma.marketplaceProvider.create({ data: provider });
  }

  console.log('Marketplace providers seeded.');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
