import { Elysia } from 'elysia';
import { adminDashboardController } from './dashboard';
import { adminUserController } from './user';
import { adminNodeController } from './node';
import { adminShopController } from './shop';
import { adminTicketController } from './ticket';
import { adminAnnouncementController } from './announcement';
import { adminCouponController } from './coupon';
import { adminCodeController } from './code';
import { adminInviteController } from './invite';
import { adminAuditController } from './audit';

export const adminController = new Elysia({ prefix: '/api/v1' })
  .use(adminDashboardController)
  .use(adminUserController)
  .use(adminNodeController)
  .use(adminShopController)
  .use(adminTicketController)
  .use(adminAnnouncementController)
  .use(adminCouponController)
  .use(adminCodeController)
  .use(adminInviteController)
  .use(adminAuditController);

