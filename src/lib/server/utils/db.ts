import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI?.replace(/^["']|["']$/g, '').trim() || "";

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      // Add listeners only once when the *initial* connection promise is created
      // Use 'once' to act as a singleton event handler for the lifetime of this connection instance
      mongoose.connection.removeAllListeners('error'); // Clear potential previous dupes if any
      mongoose.connection.on('error', (err) => {
        console.error("MongoDB connection error:", err);
      });
      
      mongoose.connection.removeAllListeners('disconnected'); 
      mongoose.connection.on('disconnected', () => {
         console.log("MongoDB disconnected");
      });

      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("Failed to connect to MongoDB:", e);
    throw e;
  }

  return cached.conn;
}
