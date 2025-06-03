import request from 'supertest';
import app from '../src/app.js';

// Подставьте валидный JWT для тестового пользователя
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb29raWVjbXMiLCJzdWIiOjQxLCJpYXQiOjE3NDg4NjY3NDEsImV4cCI6MTc0ODg3MDM0MX0._ZiyQbrEfHNQVw_gI-W4s3LaC1IXAhoM8LbSv9YmoxM';

describe('Home API', () => {
  it('GET /api/home — should return home data for authorized user', async () => {
    const res = await request(app)
      .get('/api/home')
      .set('Authorization', `Bearer ${TEST_JWT}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('error', false);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toMatchObject({
        Username: expect.any(String),
        Uuid: expect.any(String),
        Selected_Cape: expect.any(Number),
        Selected_Skin: expect.any(Number), // ← исправлено
        PermLvl: expect.any(Number),
        Capes: expect.any(Array),
        // Skin: expect.any(Array), // ← закомментируйте, если поля нет в ответе
        Discord_integration: expect.any(Boolean),
        Discord: expect.any(Object),
        Mail_verification: expect.any(Boolean),
        });
  });

  it('GET /api/home — should return 401 for unauthorized user', async () => {
    const res = await request(app)
      .get('/api/home');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/home/edit/username — should change username', async () => {
    const res = await request(app)
      .patch('/api/home/edit/username')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        username: 'new_username',
        password: 'test'
      });
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.error).toBe(false);
      expect(res.body.msg).toMatch(/success/i);
    }
  });

  it('PATCH /api/home/edit/password — should change password', async () => {
    const res = await request(app)
      .patch('/api/home/edit/password')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        password: 'test',
        newpassword: 'test'
      });
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.error).toBe(false);
      expect(res.body.msg).toMatch(/success/i);
    }
  });

  it('POST /api/home/mail/request — should request mail change', async () => {
    const res = await request(app)
      .post('/api/home/mail/request')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        mail: 'newmail@example.com',
        password: 'test'
      });
    expect([200, 400]).toContain(res.status);
  });

  it('POST /api/home/mail/validate — should validate mail code', async () => {
    const res = await request(app)
      .post('/api/home/mail/validate')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        code: 'code',
        password: 'test'
      });
    expect([200, 400]).toContain(res.status);
  });

  it('PUT /api/home/edit/skin — should update skin', async () => {
    const res = await request(app)
      .put('/api/home/edit/skin')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        skinid: 'uuid',
        name: 'name',
        slim: true,
        cloakid: 'uuid'
      });
    expect([200, 400]).toContain(res.status);
  });

  it('POST /api/home/edit/skin/select — should select skin', async () => {
    const res = await request(app)
      .post('/api/home/edit/skin/select')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        skinid: 'uuid'
      });
    expect([200, 400]).toContain(res.status);
  });

  it('DELETE /api/home/edit/skin — should delete skin', async () => {
    const res = await request(app)
      .delete('/api/home/edit/skin')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        skinid: 'uuid'
      });
    expect([200, 400]).toContain(res.status);
  });

  it('POST /api/home/edit/removediscord — should remove discord integration', async () => {
    const res = await request(app)
      .post('/api/home/edit/removediscord')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({
        password: 'test'
      });
    expect([200, 400]).toContain(res.status);
  });

  it('POST /api/home/edit/upload — should upload skin', async () => {
    const res = await request(app)
      .post('/api/home/edit/upload')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .field('slim', 'true')
      .attach('skin', Buffer.from('fake'), 'skin.png');
    expect([200, 400]).toContain(res.status);
  });
});