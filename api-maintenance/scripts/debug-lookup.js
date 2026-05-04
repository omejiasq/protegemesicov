const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugLookup() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('protegeme_db');

    console.log('🔍 Debugging Lookup Relationship...\n');

    // Get sample enlistment
    const sampleEnlistment = await db.collection('enlistments').findOne();
    console.log('📝 Sample enlistment mantenimientoId:', sampleEnlistment.mantenimientoId);
    console.log('Type:', typeof sampleEnlistment.mantenimientoId);
    console.log();

    // Get sample enlistment_item_results with same mantenimientoId
    const matchingItems = await db.collection('enlistment_item_results').find({
      mantenimientoId: sampleEnlistment.mantenimientoId
    }).toArray();
    console.log(`📋 Found ${matchingItems.length} matching items for this mantenimientoId`);

    if (matchingItems.length > 0) {
      console.log('Sample matching item result:');
      console.log(JSON.stringify(matchingItems[0], null, 2));
    }

    // Check different data types in enlistment_item_results
    const itemResults = await db.collection('enlistment_item_results').aggregate([
      { $group: { _id: { $type: '$mantenimientoId' }, count: { $sum: 1 } } }
    ]).toArray();
    console.log('\n📊 mantenimientoId types in enlistment_item_results:');
    console.log(itemResults);

    const enlistments = await db.collection('enlistments').aggregate([
      { $group: { _id: { $type: '$mantenimientoId' }, count: { $sum: 1 } } }
    ]).toArray();
    console.log('\n📊 mantenimientoId types in enlistments:');
    console.log(enlistments);

    // Try to find some actual matches by checking if any mantenimientoIds exist in both collections
    console.log('\n🔍 Looking for actual matches...');
    const commonIds = await db.collection('enlistments').aggregate([
      {
        $lookup: {
          from: 'enlistment_item_results',
          let: { localId: '$mantenimientoId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$mantenimientoId', '$$localId'] } } },
            { $limit: 1 }
          ],
          as: 'matched_items'
        }
      },
      { $match: { 'matched_items.0': { $exists: true } } },
      { $limit: 5 },
      {
        $project: {
          mantenimientoId: 1,
          placa: 1,
          matched_count: { $size: '$matched_items' }
        }
      }
    ]).toArray();

    console.log(`Found ${commonIds.length} enlistments with matching items:`);
    console.log(JSON.stringify(commonIds, null, 2));

    // Also check for string vs ObjectId conversion issues
    console.log('\n🔍 Checking for potential ObjectId conversion issues...');
    const sampleItemResult = await db.collection('enlistment_item_results').findOne();
    console.log('Sample item result mantenimientoId:', sampleItemResult.mantenimientoId);
    console.log('Type:', typeof sampleItemResult.mantenimientoId);

    // Check if we need to convert string to ObjectId or vice versa
    const { ObjectId } = require('mongodb');

    // Try to find items where mantenimientoId matches as ObjectId
    try {
      const objectIdMatch = await db.collection('enlistment_item_results').find({
        mantenimientoId: new ObjectId(sampleEnlistment.mantenimientoId)
      }).limit(5).toArray();
      console.log(`\n📋 Found ${objectIdMatch.length} items when converting to ObjectId`);
    } catch (e) {
      console.log('\n❌ Cannot convert to ObjectId:', e.message);
    }

    // Try to find items where mantenimientoId matches as string
    const stringMatch = await db.collection('enlistment_item_results').find({
      mantenimientoId: String(sampleEnlistment.mantenimientoId)
    }).limit(5).toArray();
    console.log(`📋 Found ${stringMatch.length} items when converting to string`);

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await client.close();
  }
}

debugLookup();