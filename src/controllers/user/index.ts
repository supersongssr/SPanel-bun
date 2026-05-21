import { Elysia } from 'elysia';
import { userDashboardController } from './dashboard';
import { userNodeController } from './node';
import { userShopController } from './shop';
import { userProfileController } from './profile';
import { userTicketController } from './ticket';
import { userRelayController } from './relay';

export const userController = new Elysia({ prefix: '/api/v1' })
  .use(userDashboardController)
  .use(userNodeController)
  .use(userShopController)
  .use(userProfileController)
  .use(userTicketController)
  .use(userRelayController);
