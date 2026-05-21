import { db } from '../config/database';
import { userTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { passwordHash } from '../utils/hash';
import { randomBytes, randomUUID } from 'crypto';

export async function createAdmin(email: string, pass: string) {
  if (!email || !pass) {
    throw new Error('Email and password are required.');
  }

  const existing = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error(`Email ${email} is already registered.`);
  }

  const maxPortUsers = await db.select()
    .from(userTable)
    .orderBy(desc(userTable.port))
    .limit(1);

  let nextPort = 10001;
  if (maxPortUsers.length > 0) {
    nextPort = maxPortUsers[0].port + 1;
    if (nextPort >= 65535) nextPort = 10001;
  }

  const userName = email.split('@')[0];
  const passHash = passwordHash(pass);
  const ssPasswd = randomBytes(6).toString('hex');
  const v2rayUuid = randomUUID();
  const regDate = new Date();

  await db.insert(userTable).values({
    userName,
    email,
    pass: passHash,
    passwd: ssPasswd,
    v2rayUuid,
    port: nextPort,
    u: 0n,
    d: 0n,
    transferEnable: 107374182400n, // 100GB
    money: '9999.00',
    inviteNum: 0,
    regDate,
    isAdmin: 1, // Admin flag
    class: 1, // Admin Class
  });

  console.log(`[CLI] Successfully created Administrator: ${email}`);
}
