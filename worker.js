import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import dbClient from './utils/db';

const queue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

queue.process(async (job, done) => {
  const { userId, fileId } = job.data;
  if (!fileId) done(new Error('Missing fileId'));
  if (!userId) done(new Error('Missing userId'));

  const files = await dbClient.filesCollection();
  const file = await files.findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) done(new Error('File not found'));

  const thumbnail500 = await imageThumbnail(file.localPath, { width: 500 });
  const thumbnail250 = await imageThumbnail(file.localPath, { width: 250 });
  const thumbnail100 = await imageThumbnail(file.localPath, { width: 100 });

  console.log(`Saved thumbnails to ${file.localPath}`);
  await fs.promises.writeFile(`${file.localPath}_500`, thumbnail500);
  await fs.promises.writeFile(`${file.localPath}_250`, thumbnail250);
  await fs.promises.writeFile(`${file.localPath}_100`, thumbnail100);
  done();
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) done(new Error('Missing userId'));
  const users = await dbClient.usersCollection();
  const user = await users.findOne({ _id: ObjectId(userId) });
  if (!user) done(new Error('User not found'));
  console.log(`Welcome ${user.email}`);
  done();
});
