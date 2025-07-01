import { addBank } from './bankService';
import { bankData as fullStaticBankData } from '../data/bankData';

export const migrateBankDataToFirebase = async (): Promise<void> => {
  try {
    console.log('Starting bank data migration...');
    
    const totalBanks = Object.keys(fullStaticBankData).length;
    let migratedCount = 0;
    let errorCount = 0;

    for (const [bankName, bankInfo] of Object.entries(fullStaticBankData)) {
      try {
        await addBank(bankName, bankInfo);
        migratedCount++;
        console.log(`✓ Migrated: ${bankName} (${migratedCount}/${totalBanks})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to migrate: ${bankName}`, error);
      }
    }

    console.log(`Migration completed! Successfully migrated: ${migratedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Helper function to check if migration is needed
export const checkMigrationStatus = async (): Promise<boolean> => {
  // This would check if banks exist in Firebase
  // Return true if migration is needed, false otherwise
  // Implementation depends on your specific needs
  return false;
}; 