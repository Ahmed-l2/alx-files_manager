import { createHash } from 'crypto';
import dbClient from '../utils/db';

export default class UserController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    if (await dbClient.userExists(email)) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }

    const result = await (await dbClient.client.db().collection('users'))
      .insertOne({ email, password: createHash('sha1').update(password).digest('hex') });
    const userId = result.insertedId.toString();

    res.status(201).json({ id: userId, email });
  }
}
