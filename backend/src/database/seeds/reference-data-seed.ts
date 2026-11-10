import type { EntityManager } from 'typeorm';
import { seedBusinessTypeCatalog } from './business-type-seed.js';
import { seedIndustryCatalog } from './industry-seed.js';
import { seedLocationCatalog } from './location-seed.js';
import { seedOccupationCatalog } from './occupation-seed.js';
import { seedSystemRoles } from './role-seed.js';

export async function seedReferenceData(manager: EntityManager) {
  const roles = await seedSystemRoles(manager);
  const locations = await seedLocationCatalog(manager);
  const businessTypes = await seedBusinessTypeCatalog(manager);
  const industries = await seedIndustryCatalog(manager);
  const occupations = await seedOccupationCatalog(manager);

  return { roles, locations, businessTypes, industries, occupations };
}
