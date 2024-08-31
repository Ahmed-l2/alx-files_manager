/* eslint-disable import/no-named-as-default */
import sha1 from 'sha1';
import dbClient from '../utils/db';

export default class UsersController {
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
    const existingUser = await (await dbClient.usersCollection()).findOne({ email });

    if (existingUser) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }

    const result = await (await dbClient.usersCollection())
      .insertOne({ email, password: sha1(password) });
    const userId = result.insertedId.toString();

    res.status(201).json({ id: userId, email });
  }
}
