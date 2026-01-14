/**
 * Ticket Controller - Support Ticket System
 *
 * Provides endpoints for:
 * - User: Create, list, reply, close tickets
 * - Admin: List all tickets, reply, change status
 */

import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../lib/jwt'

// User ticket endpoints
export const userTicketController = new Elysia({ prefix: '/user/tickets' })

/**
 * GET /api/user/tickets
 *
 * Get user's ticket list with pagination
 */
userTicketController.get('/', async ({ set, request, query }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = BigInt(payload.userId)
    const params = query as any
    const page = parseInt(params.page) || 1
    const pageSize = Math.min(parseInt(params.pageSize) || 20, 100)
    const status = params.status

    // Build where clause
    const where: any = {
      userid: userId,
      rootid: {
        equals: BigInt(0),
      },
    }

    if (status !== undefined) {
      where.status = status === 'open' ? 1 : 0
    }

    // Get total count
    const total = await prisma.ticket.count({ where })

    // Get tickets with pagination
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: {
        datetime: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get latest message for each ticket
    const formattedTickets = await Promise.all(
      tickets.map(async (ticket: any) => {
        const replies = await prisma.ticket.findMany({
          where: {
            rootid: ticket.id,
          },
          orderBy: {
            datetime: 'desc',
          },
          take: 1,
        })

        const latestReply = replies.length > 0 ? replies[0] : null
        const lastMessage = latestReply?.content || ticket.content

        return {
          id: ticket.id,
          title: ticket.title,
          content: ticket.content,
          status: ticket.status === 1,
          datetime: ticket.datetime ? new Date(parseInt(ticket.datetime.toString()) * 1000) : null,
          lastMessage: lastMessage,
          lastMessageTime: latestReply?.datetime
            ? new Date(parseInt(latestReply.datetime.toString()) * 1000)
            : (ticket.datetime ? new Date(parseInt(ticket.datetime.toString()) * 1000) : null),
          replyCount: await prisma.ticket.count({
            where: {
              rootid: ticket.id,
            },
          }),
        }
      })
    )

    return {
      tickets: formattedTickets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('Get user tickets error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch tickets',
    }
  }
}, {
  detail: {
    tags: ['User', 'Ticket'],
    description: 'Get user ticket list',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/user/tickets/:id
 *
 * Get ticket details and conversation history
 */
userTicketController.get('/:id', async ({ set, request, params }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = BigInt(payload.userId)
    const ticketId = BigInt(params.id)

    // Get main ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userid: userId,
        rootid: BigInt(0),
      },
    })

    if (!ticket) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Ticket not found',
      }
    }

    // Get all replies
    const replies = await prisma.ticket.findMany({
      where: {
        rootid: ticketId,
      },
      orderBy: {
        datetime: 'asc',
      },
    })

    // Format messages
    const messages = [
      {
        id: ticket.id,
        userid: ticket.userid,
        content: ticket.content,
        datetime: ticket.datetime ? new Date(parseInt(ticket.datetime.toString()) * 1000) : null,
        isAdmin: false,
      },
      ...replies.map((reply: any) => ({
        id: reply.id,
        userid: reply.userid,
        content: reply.content,
        datetime: reply.datetime ? new Date(parseInt(reply.datetime.toString()) * 1000) : null,
        isAdmin: reply.userid.toString() !== userId.toString(),
      })),
    ]

    return {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status === 1,
        datetime: ticket.datetime ? new Date(parseInt(ticket.datetime.toString()) * 1000) : null,
      },
      messages,
    }
  } catch (error) {
    console.error('Get ticket details error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch ticket details',
    }
  }
}, {
  detail: {
    tags: ['User', 'Ticket'],
    description: 'Get ticket details and conversation',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/user/tickets
 *
 * Create a new ticket
 */
userTicketController.post('/', async ({ set, request, body }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = BigInt(payload.userId)
    const data = body as any

    // Validate
    if (!data.title || !data.content) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Title and content are required',
      }
    }

    // Create ticket
    const now = BigInt(Math.floor(Date.now() / 1000))
    const ticket = await prisma.ticket.create({
      data: {
        userid: userId,
        title: data.title,
        content: data.content,
        rootid: BigInt(0),
        datetime: now,
        status: 1,
      },
    })

    return {
      message: 'Ticket created successfully',
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status === 1,
      },
    }
  } catch (error) {
    console.error('Create ticket error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to create ticket',
    }
  }
}, {
  body: t.Object({
    title: t.String(),
    content: t.String(),
  }),
  detail: {
    tags: ['User', 'Ticket'],
    description: 'Create a new ticket',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/user/tickets/:id/reply
 *
 * Reply to a ticket
 */
userTicketController.post('/:id/reply', async ({ set, request, params, body }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = BigInt(payload.userId)
    const ticketId = BigInt(params.id)
    const data = body as any

    // Validate
    if (!data.content) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Content is required',
      }
    }

    // Check if ticket exists and belongs to user
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userid: userId,
        rootid: BigInt(0),
      },
    })

    if (!ticket) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Ticket not found',
      }
    }

    // Create reply
    const now = BigInt(Math.floor(Date.now() / 1000))
    await prisma.ticket.create({
      data: {
        userid: userId,
        title: ticket.title,
        content: data.content,
        rootid: ticketId,
        datetime: now,
        status: 1,
      },
    })

    // Reopen ticket if it was closed
    if (ticket.status === 0) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 1 },
      })
    }

    return {
      message: 'Reply added successfully',
    }
  } catch (error) {
    console.error('Reply ticket error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to reply to ticket',
    }
  }
}, {
  body: t.Object({
    content: t.String(),
  }),
  detail: {
    tags: ['User', 'Ticket'],
    description: 'Reply to a ticket',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/user/tickets/:id/close
 *
 * Close a ticket
 */
userTicketController.post('/:id/close', async ({ set, request, params }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = BigInt(payload.userId)
    const ticketId = BigInt(params.id)

    // Check if ticket exists and belongs to user
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userid: userId,
        rootid: BigInt(0),
      },
    })

    if (!ticket) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Ticket not found',
      }
    }

    // Close ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 0 },
    })

    return {
      message: 'Ticket closed successfully',
    }
  } catch (error) {
    console.error('Close ticket error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to close ticket',
    }
  }
}, {
  detail: {
    tags: ['User', 'Ticket'],
    description: 'Close a ticket',
    security: [{ BearerAuth: [] }],
  },
})

// Admin ticket endpoints
export const adminTicketController = new Elysia({ prefix: '/admin/tickets' })

/**
 * GET /api/admin/tickets
 *
 * Get all tickets with pagination (admin)
 */
adminTicketController.get('/', async ({ set, request, query }) => {
  try {
    // Verify admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const params = query as any
    const page = parseInt(params.page) || 1
    const pageSize = Math.min(parseInt(params.pageSize) || 20, 100)
    const status = params.status

    // Build where clause
    const where: any = {
      rootid: BigInt(0),
    }

    if (status !== undefined) {
      where.status = status === 'open' ? 1 : 0
    }

    // Get total count
    const total = await prisma.ticket.count({ where })

    // Get tickets with pagination
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: {
        datetime: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Format tickets with user info
    const formattedTickets = await Promise.all(
      tickets.map(async (ticket: any) => {
        const user = await prisma.user.findUnique({
          where: { id: Number(ticket.userid) },
          select: {
            id: true,
            email: true,
            user_name: true,
          },
        })

        const replies = await prisma.ticket.findMany({
          where: {
            rootid: ticket.id,
          },
          orderBy: {
            datetime: 'desc',
          },
          take: 1,
        })

        const latestReply = replies.length > 0 ? replies[0] : null

        return {
          id: ticket.id,
          title: ticket.title,
          content: ticket.content,
          status: ticket.status === 1,
          datetime: ticket.datetime ? new Date(parseInt(ticket.datetime.toString()) * 1000) : null,
          user: user,
          lastMessageTime: latestReply?.datetime
            ? new Date(parseInt(latestReply.datetime.toString()) * 1000)
            : null,
          replyCount: await prisma.ticket.count({
            where: {
              rootid: ticket.id,
            },
          }),
        }
      })
    )

    return {
      tickets: formattedTickets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('Get admin tickets error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch tickets',
    }
  }
}, {
  detail: {
    tags: ['Admin', 'Ticket'],
    description: 'Get all tickets (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/admin/tickets/:id
 *
 * Get ticket details (admin)
 */
adminTicketController.get('/:id', async ({ set, request, params }) => {
  try {
    // Verify admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const ticketId = BigInt(params.id)

    // Get main ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        rootid: BigInt(0),
      },
    })

    if (!ticket) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Ticket not found',
      }
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: Number(ticket.userid) },
      select: {
        id: true,
        email: true,
        user_name: true,
      },
    })

    // Get all replies
    const replies = await prisma.ticket.findMany({
      where: {
        rootid: ticketId,
      },
      orderBy: {
        datetime: 'asc',
      },
    })

    // Format messages
    const messages = [
      {
        id: ticket.id,
        userid: ticket.userid,
        content: ticket.content,
        datetime: ticket.datetime ? new Date(parseInt(ticket.datetime.toString()) * 1000) : null,
        isAdmin: false,
      },
      ...replies.map((reply: any) => ({
        id: reply.id,
        userid: reply.userid,
        content: reply.content,
        datetime: reply.datetime ? new Date(parseInt(reply.datetime.toString()) * 1000) : null,
        isAdmin: reply.userid.toString() !== ticket.userid.toString(),
      })),
    ]

    return {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status === 1,
        datetime: ticket.datetime ? new Date(parseInt(ticket.datetime.toString()) * 1000) : null,
        user: user,
      },
      messages,
    }
  } catch (error) {
    console.error('Get admin ticket details error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch ticket details',
    }
  }
}, {
  detail: {
    tags: ['Admin', 'Ticket'],
    description: 'Get ticket details (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/admin/tickets/:id/reply
 *
 * Reply to a ticket (admin)
 */
adminTicketController.post('/:id/reply', async ({ set, request, params, body }) => {
  try {
    // Verify admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const adminUserId = BigInt(payload.userId)
    const ticketId = BigInt(params.id)
    const data = body as any

    // Validate
    if (!data.content) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Content is required',
      }
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        rootid: BigInt(0),
      },
    })

    if (!ticket) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Ticket not found',
      }
    }

    // Create reply as admin
    const now = BigInt(Math.floor(Date.now() / 1000))
    await prisma.ticket.create({
      data: {
        userid: adminUserId,
        title: ticket.title,
        content: data.content,
        rootid: ticketId,
        datetime: now,
        status: 1,
      },
    })

    // Update ticket status if specified
    if (data.status !== undefined) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: data.status ? 1 : 0 },
      })
    }

    return {
      message: 'Reply added successfully',
    }
  } catch (error) {
    console.error('Admin reply ticket error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to reply to ticket',
    }
  }
}, {
  body: t.Object({
    content: t.String(),
    status: t.Optional(t.Boolean()),
  }),
  detail: {
    tags: ['Admin', 'Ticket'],
    description: 'Reply to a ticket (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/admin/tickets/:id/status
 *
 * Update ticket status (admin)
 */
adminTicketController.post('/:id/status', async ({ set, request, params, body }) => {
  try {
    // Verify admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const ticketId = BigInt(params.id)
    const data = body as any

    // Check if ticket exists
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        rootid: BigInt(0),
      },
    })

    if (!ticket) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Ticket not found',
      }
    }

    // Update ticket status
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: data.status ? 1 : 0 },
    })

    return {
      message: `Ticket ${data.status ? 'opened' : 'closed'} successfully`,
    }
  } catch (error) {
    console.error('Update ticket status error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to update ticket status',
    }
  }
}, {
  body: t.Object({
    status: t.Boolean(),
  }),
  detail: {
    tags: ['Admin', 'Ticket'],
    description: 'Update ticket status (admin only)',
    security: [{ BearerAuth: [] }],
  },
})
