import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;

      if (!email) return res.status(400).json({ error: 'Missing email' });
      if (!password) return res.status(400).json({ error: 'Missing password' });

      const usersCollection = await dbClient.usersCollection();

      const user = await usersCollection.findOne({ email });
      if (user) return res.status(400).json({ error: 'Already exist' });

      const hashedPassword = sha1(password);
      const result = await usersCollection.insertOne({ email, password: hashedPassword });

      return res.status(201).json({ id: result.insertedId, email });
    } catch (err) {
      console.error('Error in postNew:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default UsersController;
