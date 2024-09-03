import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async getUser(request) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId) {
      const users = await dbClient.usersCollection();
      const idObject = new ObjectId(userId);
      const user = await users.findOne({ _id: idObject });
      if (!user) {
        return null;
      }
      return user;
    }
    return null;
  }

  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const users = await dbClient.usersCollection();
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, data, parentId, isPublic,
    } = req.body;
    const acceptedType = ['folder', 'file', 'image'];

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !acceptedType.includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    const filesCollection = await dbClient.filesCollection();

    if (parentId) {
      const file = await filesCollection.findOne({ _id: ObjectId(parentId), userId });
      if (!file) return res.status(400).json({ error: 'Parent not found' });
      if (file.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileData = {
      userId,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId ? ObjectId(parentId) : 0,
    };

    try {
      if (type === 'folder') {
        const newFile = await filesCollection.insertOne({ ...fileData });
        return res.status(201).json({ id: newFile.insertedId, ...fileData });
      }

      const relativePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(relativePath)) {
        fs.mkdirSync(relativePath);
      }

      const fileId = uuidv4();
      const filePath = `${relativePath}/${fileId}`;
      fs.writeFileSync(filePath, data, 'base64');

      const newFile = await filesCollection.insertOne({ ...fileData, localPath: filePath });
      return res.status(201).json({ id: newFile.insertedId, ...fileData });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getShow(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) return response.status(401).json({ error: 'Unauthorized' });
    const fileId = request.params.id;
    const files = await dbClient.filesCollection();
    const idObject = new ObjectId(fileId);
    const file = await files.findOne({ _id: idObject, userId: user._id });
    if (!file) return response.status(404).json({ error: 'Not found' });
    return response.status(200).json(file);
  }

  static async getIndex(request, response) {
    const user = await FilesController.getUser(request);

    if (!user) return response.status(401).json({ error: 'Unauthorized' });

    const { parentId, page, } = request.query;
    const pageNum = page || 0;
    const files = await dbClient.filesCollection();
    let query;

    if (!parentId) query = { userId: user._id };
    else query = { userId: user._id, parentId: ObjectId(parentId) };

    files.aggregate(
      [
        { $match: query },
        { $sort: { _id: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }, { $addFields: { page: parseInt(pageNum, 10) } }],
            data: [{ $skip: 20 * parseInt(pageNum, 10) }, { $limit: 20 }],
          },
        },
      ],
    ).toArray((err, result) => {
      if (result) {
        const final = result[0].data.map((file) => {
          const tmpFile = {
            ...file,
            id: file._id,
          };
          delete tmpFile._id;
          delete tmpFile.localPath;
          return tmpFile;
        });
        return response.status(200).json(final);
      }
      console.log('Error occured');
      return response.status(404).json({ error: 'Not found' });
    });
    return null;
  }

  static async putPublish(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) return response.status(401).json({ error: 'Unauthorized' });
    const { id } = request.params;
    const files = await dbClient.filesCollection();
    const idObject = new ObjectId(id);
    const update = { $set: { isPublic: true } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate({ _id: idObject, userId: user._id }, update, options, (err, file) => {
      if (!file.lastErrorObject.updatedExisting) {
        return response.status(404).json({ error: 'Not found' });
      }
      return response.status(200).json(file.value);
    });
    return null;
  }

  static async putUnpublish(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = request.params;
    const files = await dbClient.filesCollection();
    const idObject = new ObjectId(id);
    const update = { $set: { isPublic: false } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate({ _id: idObject, userId: user._id }, update, options, (err, file) => {
      if (!file.lastErrorObject.updatedExisting) {
        return response.status(404).json({ error: 'Not found' });
      }
      return response.status(200).json(file.value);
    });
    return null;
  }
}

export default FilesController;
