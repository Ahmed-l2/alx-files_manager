import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const queue = new Queue('userQueue');
    try {
      const { email, password } = req.body;

      if (!email) return res.status(400).json({ error: 'Missing email' });
      if (!password) return res.status(400).json({ error: 'Missing password' });

      const usersCollection = await dbClient.usersCollection();

      const user = await usersCollection.findOne({ email });
      if (user) return res.status(400).json({ error: 'Already exist' });

      const hashedPassword = sha1(password);
      const result = await usersCollection.insertOne({ email, password: hashedPassword });
      queue.add({ userId: result.insertedId });
      return res.status(201).json({ id: result.insertedId, email });
    } catch (err) {
      console.error('Error in postNew:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId) {
      const users = await dbClient.usersCollection();
      const idObject = new ObjectId(userId);
      users.findOne({ _id: idObject }, (err, user) => {
        if (user) {
          response.status(200).json({ id: userId, email: user.email });
        } else {
          response.status(401).json({ error: 'Unauthorized' });
        }
      });
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}

export default UsersController;
