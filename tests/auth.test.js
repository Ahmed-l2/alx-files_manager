/* eslint-disable */
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import server from '../server';
import dbClient from '../utils/db';

chai.use(chaiHttp);
const should = chai.should();

describe('tests user authentication', () => {
  const user = { "email": "bob@dylan.com", "password": "toto1234!" };
  let encoded_data = Buffer.from(`${user.email}:${user.password}`).toString('base64');
  let userId;
  let token;

  before(function(done) {
      this.timeout(5000);
      setTimeout(async function() {
        try {
          const usersCollection = await dbClient.usersCollection();
          const filesCollection = await dbClient.filesCollection();
          await Promise.all([usersCollection.deleteMany({}), filesCollection.deleteMany({})]);
          const res = await new Promise((resolve, reject) => {
            chai.request(server).post('/users').send(user).end((err, res) => {
              if (err) reject(err);
              else resolve(res);
            });
          });
          userId = res.body.id;
          done();
        } catch (err) {
          done(err);
        }
      }, 4500);
  });

  it('test GET /connect', (done) => {
   chai.request(server).get('/connect').set('Authorization', `Basic ${encoded_data}`).end((err, res) => {
    should.not.exist(err);
    res.body.should.have.property('token');
    token = res.body.token;
    expect(res.statusCode).to.equal(200);
    done();
   });
  });

  it('test GET /connect with wrong authorization', (done) => {
    chai.request(server).get('/connect').set('Authorization', `Basic encoding`).end((err, res) => {
      expect(res.statusCode).to.equal(401);
      res.body.should.have.property('error').equal('Unauthorized');
      done();
    });
  });

  it('test GET /users/me', (done) => {
    chai.request(server).get('/users/me').set('X-Token', `${token}`).end((err, res) => {
      should.not.exist(err);
      res.body.should.have.property('id').equal(userId);
      res.body.should.have.property('email').equal(user.email);
      expect(res.statusCode).to.equal(200);
      done();
    });
  });

  it('test GET /disconnect with wrong token', (done) => {
    chai.request(server).get('/disconnect').set('X-Token', `token`).end((err, res) => {
      expect(res.statusCode).to.equal(401);
      res.body.should.have.property('error').equal('Unauthorized');
      done();
    });
  });

  it('test GET /disconnect', (done) => {
    chai.request(server).get('/disconnect').set('X-Token', `${token}`).end((err, res) => {
     should.not.exist(err);
     expect(res.statusCode).to.equal(204);
     done();
    });
  });

});
