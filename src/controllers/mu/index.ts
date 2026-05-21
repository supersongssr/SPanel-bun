import { Elysia } from 'elysia';
import { muUsersController } from './users';
import { muTrafficController } from './traffic';

export const muController = new Elysia({ prefix: '/api' })
  .use(muUsersController)
  .use(muTrafficController);
