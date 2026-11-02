'use strict';

const request = require('supertest');
const app = require('../../src/app');

describe('Health and Root API Endpoints', () => {
  test('GET /health returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET /api/v1 returns API information and registered endpoints', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.endpoints.auth).toBe('/api/v1/auth');
    expect(res.body.endpoints.devices).toBe('/api/v1/devices');
    expect(res.body.endpoints.comports).toBe('/api/v1/comports');
    expect(res.body.endpoints.registers).toBe('/api/v1/registers');
    expect(res.body.endpoints.readings).toBe('/api/v1/readings');
  });

  test('GET non-existent route returns 404', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET with accidental trailing space normalizes path correctly', async () => {
    const res = await request(app).get('/health ');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET non-numeric ID under /api/v1/readings does not match :id and returns 404', async () => {
    const res = await request(app).get('/api/v1/readings/nonexistentroute');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('POST test-email does not require a bearer token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/test-email')
      .send({ userId: 'invalid' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  test('POST readings accepts no bearer token but requires a profile ID', async () => {
    const res = await request(app)
      .post('/api/v1/readings')
      .send({ registerId: 1, rawValue: 1, scaledValue: 1 });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });
});
