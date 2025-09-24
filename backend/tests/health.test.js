const request = require('supertest');
const { expect } = require('chai');
const { app } = require('../server');

describe('Readiness Endpoint', () => {
  it('GET /api/ready returns 200 and JSON', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ready', true);
    expect(res.body).to.have.property('status');
    expect(res.body.status).to.be.an('object');
  });
});
