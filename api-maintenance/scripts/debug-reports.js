const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugReports() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('protegeme_db');

    console.log('🔍 Debugging Reports Issue...\n');

    // Check if enlistments collection exists and has data
    console.log('📊 Checking enlistments collection...');
    const enlistmentsCount = await db.collection('enlistments').countDocuments();
    console.log(`Total enlistments documents: ${enlistmentsCount}`);

    if (enlistmentsCount > 0) {
      // Sample document structure
      const sampleEnlistment = await db.collection('enlistments').findOne();
      console.log('\n📝 Sample enlistment document structure:');
      console.log(JSON.stringify(sampleEnlistment, null, 2));

      // Check enterprise_id distribution
      console.log('\n🏢 Enterprise ID distribution:');
      const enterpriseDistribution = await db.collection('enlistments').aggregate([
        { $group: { _id: '$enterprise_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();
      console.log(enterpriseDistribution);
    }

    // Check enlistment_item_results collection
    console.log('\n📋 Checking enlistment_item_results collection...');
    const itemResultsCount = await db.collection('enlistment_item_results').countDocuments();
    console.log(`Total enlistment_item_results documents: ${itemResultsCount}`);

    if (itemResultsCount > 0) {
      const sampleItemResult = await db.collection('enlistment_item_results').findOne();
      console.log('\n📝 Sample enlistment_item_results document structure:');
      console.log(JSON.stringify(sampleItemResult, null, 2));
    }

    // Test the aggregation pipeline that the reports service uses
    console.log('\n🔧 Testing aggregation pipeline...');

    // Use a sample enterprise_id from the data
    let testEnterpriseId = null;
    if (enlistmentsCount > 0) {
      const firstDoc = await db.collection('enlistments').findOne();
      testEnterpriseId = firstDoc?.enterprise_id;
    }

    if (testEnterpriseId) {
      console.log(`Testing with enterprise_id: ${testEnterpriseId}`);

      const pipeline = [
        // 1. Match por empresa
        {
          $match: {
            enterprise_id: testEnterpriseId
          }
        },

        // 2. Lookup con enlistment_item_results
        {
          $lookup: {
            from: 'enlistment_item_results',
            localField: 'mantenimientoId',
            foreignField: 'mantenimientoId',
            as: 'items'
          }
        },

        // 3. AddFields - cálculos derivados
        {
          $addFields: {
            total_items: { $size: '$items' },
            items_ok: {
              $size: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: { $eq: ['$$item.estado', 'C'] }
                }
              }
            },
            items_falla: {
              $size: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: { $ne: ['$$item.estado', 'C'] }
                }
              }
            }
          }
        },

        // 4. Project basic fields for debugging
        {
          $project: {
            placa: 1,
            nombresResponsable: 1,
            nombresConductor: 1,
            estado: 1,
            sicov_sync_status: 1,
            createdAt: 1,
            total_items: 1,
            items_ok: 1,
            items_falla: 1,
            mantenimientoId: 1
          }
        },

        { $limit: 5 }
      ];

      const results = await db.collection('enlistments').aggregate(pipeline).toArray();
      console.log(`\n📊 Pipeline results (${results.length} documents):`);
      results.forEach((doc, index) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log(JSON.stringify(doc, null, 2));
      });

    } else {
      console.log('❌ No enterprise_id found to test with');
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await client.close();
  }
}

debugReports();