import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';

    this.url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(this.url);
    this.database = database;
    this.isConnected = false;

    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Connection failed:', error);
      this.isConnected = false;
    }
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    if (!this.isAlive()) {
      throw new Error('Database not connected');
    }
    const db = this.client.db(this.database);
    const count = await db.collection('users').countDocuments();
    return count;
  }

  async nbFiles() {
    if (!this.isAlive()) {
      throw new Error('Database not connected');
    }
    const db = this.client.db(this.database);
    const count = await db.collection('files').countDocuments();
    return count;
  }
}

const dbClient = new DBClient();
export default dbClient;
