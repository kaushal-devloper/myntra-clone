const mongoose = require("mongoose");

const localURI = "mongodb://127.0.0.1:27017/myntra";
const atlasURI = "mongodb://Myntra:Kaushal12345@ac-nnajhmv-shard-00-00.h8ak5ij.mongodb.net:27017,ac-nnajhmv-shard-00-01.h8ak5ij.mongodb.net:27017,ac-nnajhmv-shard-00-02.h8ak5ij.mongodb.net:27017/myntra?ssl=true&authSource=admin&replicaSet=atlas-ve35z4-shard-0";

async function migrate() {
  let localConn, atlasConn;
  try {
    console.log("Connecting to LOCAL MongoDB...");
    localConn = await mongoose.createConnection(localURI).asPromise();
    console.log("✅ Connected to LOCAL MongoDB successfully!\n");

    console.log("Connecting to ATLAS MongoDB...");
    atlasConn = await mongoose.createConnection(atlasURI).asPromise();
    console.log("✅ Connected to ATLAS MongoDB successfully!\n");

    const localDb = localConn.db;
    const atlasDb = atlasConn.db;

    const collections = await localDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections locally to migrate.\n`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      // Skip system collections if any
      if (colName.startsWith("system.")) {
        console.log(`Skipping system collection: ${colName}`);
        continue;
      }

      console.log(`--- Migrating collection: ${colName} ---`);
      
      const localColl = localDb.collection(colName);
      const atlasColl = atlasDb.collection(colName);

      // Fetch all docs from local collection
      const docs = await localColl.find({}).toArray();
      console.log(`  Fetched ${docs.length} documents from local.`);

      // Clear the target collection in Atlas
      const deleteResult = await atlasColl.deleteMany({});
      console.log(`  Cleared ${deleteResult.deletedCount} existing documents from Atlas.`);

      if (docs.length > 0) {
        // Insert docs into Atlas
        const insertResult = await atlasColl.insertMany(docs);
        console.log(`  Inserted ${insertResult.insertedCount} documents into Atlas.`);
      } else {
        console.log(`  No documents to insert for ${colName}.`);
      }
      console.log(`✅ Completed migration for ${colName}\n`);
    }

    console.log("🎉 Database Migration Completed Successfully!");
  } catch (err) {
    console.error("❌ Migration failed with error:", err);
  } finally {
    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
  }
}

migrate();
