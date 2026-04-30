#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Probando conexión a MongoDB Atlas...');
  console.log('URI:', process.env.MONGO_URI?.replace(/:([^:@]{8})[^:@]*@/, ':$1***@'));

  const client = new MongoClient(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  try {
    console.log('⏳ Conectando...');
    await client.connect();

    console.log('✅ Conexión exitosa!');

    // Ping a la base de datos
    const result = await client.db().admin().ping();
    console.log('🏓 Ping result:', result);

    // Listar bases de datos
    const databases = await client.db().admin().listDatabases();
    console.log('📄 Bases de datos disponibles:');
    databases.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Probar la base de datos específica
    const db = client.db('protegeme_db');
    const collections = await db.listCollections().toArray();
    console.log(`📦 Colecciones en protegeme_db (${collections.length}):`);
    collections.slice(0, 5).forEach(col => {
      console.log(`  - ${col.name}`);
    });
    if (collections.length > 5) {
      console.log(`  ... y ${collections.length - 5} más`);
    }

  } catch (error) {
    console.error('❌ Error de conexión:');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensaje:', error.message);

    if (error.cause) {
      console.error('Causa:', error.cause.message);
    }

    // Sugerencias de troubleshooting
    console.log('\n🔧 Posibles soluciones:');
    if (error.message.includes('ENOTFOUND')) {
      console.log('- Verifica tu conexión a internet');
      console.log('- Revisa si hay un firewall bloqueando la conexión');
      console.log('- Asegúrate que el cluster de MongoDB Atlas esté activo');
    }
    if (error.message.includes('authentication')) {
      console.log('- Verifica las credenciales en MONGO_URI');
      console.log('- Confirma que el usuario tenga permisos adecuados');
    }
    if (error.message.includes('timeout')) {
      console.log('- Incrementa el timeout en la configuración');
      console.log('- Verifica la latencia de red a MongoDB Atlas');
    }

    process.exit(1);

  } finally {
    await client.close();
    console.log('🔐 Conexión cerrada');
  }
}

testConnection().catch(console.error);