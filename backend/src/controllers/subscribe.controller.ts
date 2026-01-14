/**
 * Subscribe Controller - Subscription Distribution System
 *
 * Provides subscription endpoints for:
 * - SS/SSR/V2Ray/Trojan link generation
 * - Node filtering by user class and group
 * - Subscription userinfo headers
 * - Multiple client format support
 */

import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'

export const subscribeController = new Elysia({ prefix: '/subscribe' })

/**
 * GET /api/subscribe/:token
 *
 * Main subscription endpoint
 *
 * Authentication: Uses link token (not JWT) from database
 * Query parameters:
 * - target: Client type (clash, surge, v2ray, ss, ssr, trojan)
 *
 * Returns:
 * - Config format based on target
 * - Subscription-Userinfo header with traffic info
 */
subscribeController.get('/:token', async ({ set, params, query }) => {
  try {
    const token = params.token
    const target = (query as any).target || 'ss'

    // 1. Find user by link token
    const link = await prisma.link.findFirst({
      where: {
        token: token,
      },
    })

    if (!link) {
      set.status = 404
      set.headers['Content-Type'] = 'text/plain; charset=utf-8'
      return 'Subscription not found'
    }

    const userId = Number(link.userid)

    // 2. Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        user_name: true,
        pass: true,
        method: true,
        protocol: true,
        obfs: true,
        class: true,
        node_group: true,
        transfer_enable: true,
        u: true,
        d: true,
        expire_in: true,
        port: true,
      },
    })

    if (!user) {
      set.status = 404
      set.headers['Content-Type'] = 'text/plain; charset=utf-8'
      return 'User not found'
    }

    // 3. Check account expiration
    if (user.expire_in) {
      const expireDate = new Date(user.expire_in)
      if (expireDate < new Date()) {
        set.status = 403
        set.headers['Content-Type'] = 'text/plain; charset=utf-8'
        return 'Account expired'
      }
    }

    // 4. Get available nodes based on user class and group
    const nodes = await prisma.ss_node.findMany({
      where: {
        node_online: 1,
        node_class: {
          lte: user.class,
        },
        OR: [
          { node_group: 0 },
          { node_group: user.node_group },
        ],
      },
      select: {
        id: true,
        name: true,
        server: true,
        port: true,
        method: true,
        type: true,
        node_class: true,
        node_group: true,
        custom_method: true,
        traffic_rate: true,
      },
      orderBy: {
        sort: 'asc',
      },
    })

    // 5. Calculate traffic usage
    const uploadBytes = Number(user.u)
    const downloadBytes = Number(user.d)
    const totalUsed = uploadBytes + downloadBytes
    const totalLimit = Number(user.transfer_enable)
    const usedPercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0

    // 6. Set subscription userinfo header
    // Format: upload=xxx; download=xxx; total=xxx; expire=xxx
    const expireTimestamp = user.expire_in
      ? Math.floor(new Date(user.expire_in).getTime() / 1000)
      : 0

    set.headers['subscription-userinfo'] =
      `upload=${uploadBytes}; download=${downloadBytes}; total=${totalLimit}; expire=${expireTimestamp}`

    // 7. Generate links based on target format
    let result = ''

    switch (target) {
      case 'clash':
        result = generateClashConfig(nodes, user)
        set.headers['Content-Type'] = 'text/yaml; charset=utf-8'
        set.headers['Content-Disposition'] = 'attachment; filename=clash.yaml'
        break

      case 'surge':
        result = generateSurgeConfig(nodes, user)
        set.headers['Content-Type'] = 'text/plain; charset=utf-8'
        set.headers['Content-Disposition'] = 'attachment; filename=surge.conf'
        break

      case 'v2ray':
      case 'vmess':
        result = generateV2RayLinks(nodes, user)
        set.headers['Content-Type'] = 'text/plain; charset=utf-8'
        break

      case 'ssr':
        result = generateSSRLinks(nodes, user)
        set.headers['Content-Type'] = 'text/plain; charset=utf-8'
        break

      case 'trojan':
        result = generateTrojanLinks(nodes, user)
        set.headers['Content-Type'] = 'text/plain; charset=utf-8'
        break

      case 'ss':
      default:
        result = generateSSLinks(nodes, user)
        set.headers['Content-Type'] = 'text/plain; charset=utf-8'
        break
    }

    return result
  } catch (error) {
    console.error('Subscribe error:', error)
    set.status = 500
    set.headers['Content-Type'] = 'text/plain; charset=utf-8'
    return 'Internal Server Error'
  }
})

/**
 * Generate SS links (one per line, base64 encoded)
 */
function generateSSLinks(nodes: any[], user: any): string {
  const links = nodes.map((node) => {
    // Format: ss://base64(method:password@server:port)#name
    const userInfo = `${user.method}:${user.pass}`
    const base64UserInfo = Buffer.from(userInfo).toString('base64')
    const link = `ss://${base64UserInfo}@${node.server}:${node.port}`
    const nodeName = encodeURIComponent(node.name)
    return `${link}#${nodeName}`
  })

  return links.join('\n')
}

/**
 * Generate SSR links
 */
function generateSSRLinks(nodes: any[], user: any): string {
  const links = nodes.map((node) => {
    // SSR format: ssr://server:port:protocol:method:obfs:passwordbase64/?remarksbase64&groupbase64
    const passwordBase64 = Buffer.from(user.pass).toString('base64')
    const remarksBase64 = Buffer.from(node.name).toString('base64')
    const groupBase64 = Buffer.from('SPanel').toString('base64')

    const protocol = user.protocol || 'origin'
    const obfs = user.obfs || 'plain'

    const link = `ssr://${node.server}:${node.port}:${protocol}:${user.method}:${obfs}:${passwordBase64}/?remarks=${remarksBase64}&group=${groupBase64}`
    return link
  })

  return links.join('\n')
}

/**
 * Generate V2Ray/VMess links
 */
function generateV2RayLinks(nodes: any[], user: any): string {
  const links = nodes.map((node) => {
    // VMess format: vmess://base64(json_config)
    const config = {
      v: '2',
      ps: node.name,
      add: node.server,
      port: node.port.toString(),
      id: user.pass,
      aid: '0',
      scy: 'auto',
      net: 'tcp',
      type: 'none',
      host: '',
      path: '',
      tls: '',
    }

    const jsonConfig = JSON.stringify(config)
    const base64Config = Buffer.from(jsonConfig).toString('base64')
    return `vmess://${base64Config}`
  })

  return links.join('\n')
}

/**
 * Generate Trojan links
 */
function generateTrojanLinks(nodes: any[], user: any): string {
  const links = nodes.map((node) => {
    // Trojan format: trojan://password@server:port?peer=sni#name
    const link = `trojan://${user.pass}@${node.server}:${node.port}?peer=${node.server}#${encodeURIComponent(node.name)}`
    return link
  })

  return links.join('\n')
}

/**
 * Generate Clash configuration (YAML)
 */
function generateClashConfig(nodes: any[], user: any): string {
  const proxies = nodes.map((node) => {
    // Shadowsocks proxy configuration
    return `  - { name: "${node.name}", type: ss, server: ${node.server}, port: ${node.port}, cipher: ${user.method}, password: "${user.pass}" }`
  })

  const proxyNames = nodes.map((node) => `    - ${node.name}`).join('\n')

  const yaml = `port: 7890
socks-port: 7891
allow-lan: true
mode: Rule
log-level: info
external-controller: 127.0.0.1:9090

proxies:
${proxies.join('\n')}

proxy-groups:
  - name: 🚀 节点选择
    type: select
    proxies:
      - ♻️ 自动选择
${proxyNames}

  - name: ♻️ 自动选择
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 300
    proxies:
${proxyNames}

rules:
  - MATCH,🚀 节点选择
`

  return yaml
}

/**
 * Generate Surge configuration
 */
function generateSurgeConfig(nodes: any[], user: any): string {
  const proxies = nodes.map((node) => {
    return `[Proxy]
${node.name} = ss, ${node.server}, ${node.port}, encrypt-method=${user.method}, password=${user.pass}`
  })

  const proxyNames = nodes.map((node) => `    - ${node.name}`).join('\n')

  const config = `[General]
loglevel = notify
interface = 127.0.0.1
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, localhost, *.local
ipv6 = true
dns-server = 8.8.8.8, 8.8.4.4

${proxies.join('\n')}

[Proxy Group]
🚀 节点选择 = select, auto, DIRECT
${proxyNames}

[Rule]
FINAL,🚀 节点选择
`

  return config
}
