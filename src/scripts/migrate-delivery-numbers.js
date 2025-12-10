/**
 * Migration script to add deliveryNumber to existing DriverEarning records
 * This script should be run once to populate deliveryNumber for existing earnings
 * 
 * Usage: node src/scripts/migrate-delivery-numbers.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const DriverEarning = require('../models/Delivery-Boy/driverEarnings');

async function migrateDeliveryNumbers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get all unique driver IDs
    const driverIds = await DriverEarning.distinct('driverId');
    console.log(`📊 Found ${driverIds.length} unique drivers`);
    
    let totalUpdated = 0;
    
    // Process each driver
    for (const driverId of driverIds) {
      // Get all earnings for this driver, sorted by date (oldest first)
      const earnings = await DriverEarning.find({ driverId })
        .sort({ date: 1, createdAt: 1 })
        .select('_id date deliveryNumber');
      
      console.log(`\n👤 Processing driver ${driverId} (${earnings.length} earnings)`);
      
      // Update each earning with sequential delivery number
      for (let i = 0; i < earnings.length; i++) {
        const earning = earnings[i];
        const deliveryNumber = i + 1;
        
        // Only update if deliveryNumber is missing or incorrect
        if (!earning.deliveryNumber || earning.deliveryNumber !== deliveryNumber) {
          await DriverEarning.updateOne(
            { _id: earning._id },
            { $set: { deliveryNumber } }
          );
          totalUpdated++;
          
          if (deliveryNumber === 16 || deliveryNumber === 21) {
            console.log(`  ⭐ Updated earning ${earning._id} to delivery number ${deliveryNumber} (BONUS DELIVERY)`);
          }
        }
      }
      
      console.log(`  ✅ Updated ${earnings.length} earnings for driver ${driverId}`);
    }
    
    console.log(`\n🎉 Migration complete! Updated ${totalUpdated} earnings records`);
    
    // Verify migration
    const earningsWithoutNumber = await DriverEarning.countDocuments({ deliveryNumber: { $exists: false } });
    if (earningsWithoutNumber > 0) {
      console.log(`⚠️  Warning: ${earningsWithoutNumber} earnings still missing deliveryNumber`);
    } else {
      console.log('✅ All earnings now have deliveryNumber');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateDeliveryNumbers();

