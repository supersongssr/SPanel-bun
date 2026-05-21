import { Elysia } from 'elysia';
import { adminDashboardController } from './dashboard';
import { adminUserController } from './user';
import { adminNodeController } from './node';
import { adminShopController } from './shop';
import { adminTicketController } from './ticket';

export const adminController = new Elysia({ prefix: '/api/v1' })
  .use(adminDashboardController)
  .use(adminUserController)
  .use(adminNodeController)
  .use(adminShopController)
  .use(adminTicketController);
