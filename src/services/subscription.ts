import { getConfig } from '../config/app';

export interface NormalizedNode {
  id?: number;
  name?: string;
  sort: number; // 0=SS, 11=VMess, 13=VLESS, 14=Trojan, 15=Hy2
  trafficRate: number;
  nodeSort?: number;
  nodeSpeedlimit?: number;
  nodeUnlock?: string;

  address: string;
  port: string;
  uuid?: string;
  password?: string;

  encryption?: string;
  security?: string;
  alterId?: string;
  flow?: string;
  isV2?: string;

  transport?: string;
  wsPath?: string;
  wsHost?: string;
  grpcService?: string;
  grpcMode?: string;
  headerType?: string;

  tlsEnabled: boolean;
  sni?: string;
  alpn?: string;
  fingerprint?: string;

  hy2Obfs?: string;
  hy2ObfsPassword?: string;
  hy2Insecure?: boolean;
  hy2UpMbps?: string;
  hy2DownMbps?: string;

  isGemini: boolean;
  isWarning: boolean;
  isNews: boolean;
  displayName: string;
}

/**
 * Parses query parameters from raw node connection strings
 */
export function parseQueryString(qs: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!qs) return result;
  const query = qs.includes('?') ? qs.substring(qs.indexOf('?') + 1) : qs;
  const parts = query.split('&');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) {
      if (part) {
        result[decodeURIComponent(part)] = '';
      }
    } else {
      const key = part.substring(0, eqIdx);
      const val = part.substring(eqIdx + 1);
      result[decodeURIComponent(key)] = decodeURIComponent(val);
    }
  }
  return result;
}

/**
 * Format bytes into human-readable strings
 */
export function flowAutoShow(value: number | bigint): string {
  const numValue = Number(value);
  const kb = 1024;
  const mb = 1048576;
  const gb = 1073741824;
  const tb = gb * 1024;
  const pb = tb * 1024;
  const absVal = Math.abs(numValue);
  
  if (absVal > pb) {
    return (numValue / pb).toFixed(2) + "PB";
  } else if (absVal > tb) {
    return (numValue / tb).toFixed(2) + "TB";
  } else if (absVal > gb) {
    return (numValue / gb).toFixed(2) + "GB";
  } else if (absVal > mb) {
    return (numValue / mb).toFixed(2) + "MB";
  } else if (absVal > kb) {
    return (numValue / kb).toFixed(2) + "KB";
  } else {
    return numValue.toFixed(2) + "B";
  }
}

/**
 * Applies SNI prepend policies for non-CDN proxy nodes
 */
export function applySniPolicy(sni: string, cdn: string, userId: number, format?: string): string {
  if (format === 'uri' || format === 'singbox' || !format) {
    return sni;
  }
  if (cdn && cdn !== '0') {
    return sni;
  }
  return 'u' + userId + 'u' + sni;
}

/**
 * Builds node subscription labels based on class, rates, limits
 */
export function buildDisplayName(node: any, user: any, n: NormalizedNode, appName: string): string {
  let name = n.name || node.name || '';
  if (n.isWarning) {
    name += '_⚠️';
  }
  name += '_x' + n.trafficRate;
  if (n.isGemini) {
    name += ' _Gemini';
  }
  if (user.class < 5) {
    name += '_' + appName;
  }
  if (n.nodeSpeedlimit && n.nodeSpeedlimit > 0) {
    name += '_⚡' + n.nodeSpeedlimit + 'M';
  }
  name += '_#' + n.id;
  return name;
}

/**
 * Parses individual physical node records
 */
export function parseNode(node: any, user: any, format?: string): NormalizedNode | null {
  const raw = parseQueryString(node.server || '');
  let address = raw['add'] || '';
  if (!address) {
    return null;
  }

  const cdn = raw['cdn'] || '';
  const cdnip = raw['cdnip'] || '';
  if (cdn && cdn !== '0' && cdnip) {
    address = cdnip;
  }

  const isGemini = !!node.nodeUnlock && /Gemini=Yes/i.test(node.nodeUnlock);
  const isWarning = (node.nodeSort ?? 0) < -9;

  const n: NormalizedNode = {
    id: node.id,
    name: node.name,
    sort: node.sort,
    trafficRate: node.trafficRate ? Number(node.trafficRate) : 1.0,
    nodeSort: node.nodeSort,
    nodeSpeedlimit: node.nodeSpeedlimit ? Number(node.nodeSpeedlimit) : 0,
    nodeUnlock: node.nodeUnlock,

    address,
    port: raw['port'] || '',
    uuid: raw['uuid'] || user.v2rayUuid || '',
    password: user.passwd || '',

    encryption: raw['encryption'] || '',
    security: raw['scy'] || 'auto',
    alterId: raw['aid'] || '0',
    flow: raw['flow'] || '',
    isV2: raw['v2'] || '',

    transport: raw['net'] || 'tcp',
    wsPath: raw['path'] || '',
    wsHost: raw['host'] || '',
    grpcService: raw['serviceName'] || '',
    grpcMode: raw['mode'] || '',
    headerType: raw['type'] || '',

    tlsEnabled: !!raw['tls'] && raw['tls'] !== 'none',
    sni: raw['sni'] || '',
    alpn: raw['alpn'] || '',
    fingerprint: raw['fp'] || '',

    hy2Obfs: raw['obfs'] || '',
    hy2ObfsPassword: raw['obfs-password'] || '',
    hy2Insecure: !!raw['insecure'] && raw['insecure'] !== '0',
    hy2UpMbps: raw['up'] || '',
    hy2DownMbps: raw['down'] || '',

    isGemini,
    isWarning,
    isNews: false,
    displayName: ''
  };

  const appName = getConfig('appName', 'SPanel');
  n.sni = applySniPolicy(n.sni || '', cdn, user.id, format);
  n.displayName = buildDisplayName(node, user, n, appName);

  return n;
}

/**
 * Generates custom news blocks and user metadata mock nodes
 */
export function parseNewsNodes(user: any, baseUrl: string, _appName: string, newsDbNodes: any[] = []): NormalizedNode[] {
  const result: NormalizedNode[] = [];
  
  let domain = baseUrl;
  try {
    const urlObj = new URL(baseUrl);
    domain = urlObj.host;
  } catch (e) {
    // Keep raw string if invalid URL
  }

  const unused = flowAutoShow(BigInt(user.transferEnable) - BigInt(user.u) - BigInt(user.d));
  const expireDate = user.expireTime ? new Date(user.expireTime * 1000).toISOString().split('T')[0] : 'Never';

  const infoItems = [
    `👨账号_${user.email}`,
    `📊流量_${unused}`,
    `🌐网址_${baseUrl}`,
    `📅日期_${expireDate}`
  ];

  for (const label of infoItems) {
    result.push({
      sort: 0,
      address: domain,
      port: '443',
      password: '6601fb90e9b3',
      encryption: 'aes-128-gcm',
      isV2: '1',
      isNews: true,
      isGemini: false,
      isWarning: false,
      tlsEnabled: false,
      transport: 'tcp',
      displayName: label,
      trafficRate: 1.0
    });
  }

  for (const node of newsDbNodes) {
    const n: NormalizedNode = {
      sort: node.sort,
      isNews: true,
      isGemini: false,
      isWarning: false,
      tlsEnabled: false,
      transport: 'tcp',
      isV2: '',
      displayName: node.name || '',
      trafficRate: 1.0,
      address: '',
      port: '443'
    };

    if (node.sort === 0) {
      n.address = domain;
      n.port = '443';
      n.password = '6601fb90e9b3';
      n.encryption = 'aes-128-gcm';
    } else if (node.sort === 11) {
      n.address = 'okxyz.xyz';
      n.port = '443';
      n.uuid = '6c6a0625-ac3f-4bd8-9cc8-0545e4e11409';
      n.security = 'none';
      n.alterId = '0';
    } else if (node.sort === 13) {
      n.address = 'fast.com';
      n.port = '443';
      n.uuid = 'c073aa06-c111-4f1c-8faf-e111ce8e1ceb';
    } else if (node.sort === 14) {
      n.address = 'fast.com';
      n.port = '443';
      n.uuid = 'c073aa06-c111-4f1c-8faf-e111ce8e1ceb';
    } else if (node.sort === 15) {
      n.address = 'fast.com';
      n.port = '443';
      n.uuid = 'c073aa06-c111-4f1c-8faf-e111ce8e1ceb';
    }
    result.push(n);
  }

  return result;
}

/**
 * Parses and returns all formatted nodes combined
 */
export function parseAll(nodes: any[], user: any, format?: string, newsDbNodes: any[] = []): NormalizedNode[] {
  const result: NormalizedNode[] = [];
  const baseUrl = getConfig('baseUrl', 'https://spanel.com');
  const appName = getConfig('appName', 'SPanel');

  const news = parseNewsNodes(user, baseUrl, appName, newsDbNodes);
  for (const n of news) {
    result.push(n);
  }

  for (const node of nodes) {
    const parsed = parseNode(node, user, format);
    if (parsed) {
      result.push(parsed);
    }
  }

  return result;
}

/**
 * Classifies the User Agent header into a target configuration type
 */
export function classifyUserAgent(ua: string): string {
  const lowercaseUa = (ua || '').toLowerCase();
  if (lowercaseUa.includes('clash') || lowercaseUa.includes('mihomo')) {
    return 'clash';
  }
  if (lowercaseUa.includes('sing-box') || lowercaseUa.includes('singbox')) {
    return 'singbox';
  }
  if (lowercaseUa.includes('surfboard')) {
    return 'surfboard';
  }
  if (lowercaseUa.includes('quantumult x') || lowercaseUa.includes('quantumultx') || lowercaseUa.includes('quanx')) {
    return 'quanx';
  }
  if (lowercaseUa.includes('loon')) {
    return 'loon';
  }
  return 'uri';
}

/**
 * Renders nodes to plain-text SS/VMess/VLESS URIs
 */
export function renderUri(nodes: NormalizedNode[], _user: any): string {
  let url = '';
  for (const n of nodes) {
    if (!n.address) continue;

    if (n.sort === 11) {
      const v2Json = {
        v: '2',
        ps: n.displayName,
        add: n.address,
        port: n.port,
        id: n.uuid || '',
        aid: n.alterId || '0',
        scy: n.security || 'auto',
        net: n.transport || 'tcp',
        type: n.headerType || '',
        host: n.wsHost || '',
        path: n.wsPath || '',
        tls: n.tlsEnabled ? 'tls' : '',
        sni: n.sni || '',
        serviceName: n.grpcService || '',
        mode: n.grpcMode || '',
        alpn: n.alpn || ''
      };
      const encoded = Buffer.from(JSON.stringify(v2Json)).toString('base64');
      url += 'vmess://' + encoded + '\n';
    } else if (n.sort === 13) {
      let item = `vless://${n.uuid}@${n.address}:${n.port}`;
      item += `?encryption=none`;
      item += `&type=${n.transport || 'tcp'}`;
      item += `&headerType=${n.headerType || ''}`;
      item += `&fp=${n.fingerprint || ''}`;
      item += `&host=${encodeURIComponent(n.wsHost || '')}`;
      item += `&path=${encodeURIComponent(n.wsPath || '')}`;
      item += `&flow=${n.flow || ''}`;
      item += `&security=${n.tlsEnabled ? 'tls' : ''}`;
      item += `&sni=${n.sni || ''}`;
      item += `&serviceName=${n.grpcService || ''}`;
      item += `&mode=${n.grpcMode || ''}`;
      item += `&alpn=${encodeURIComponent(n.alpn || '')}`;
      item += `#${encodeURIComponent(n.displayName)}\n`;
      url += item;
    } else if (n.sort === 14) {
      let item = `trojan://${n.uuid}@${n.address}:${n.port}`;
      item += `?type=${n.transport || 'tcp'}`;
      item += `&headerType=${n.headerType || ''}`;
      item += `&host=${encodeURIComponent(n.wsHost || '')}`;
      item += `&path=${encodeURIComponent(n.wsPath || '')}`;
      item += `&flow=${n.flow || ''}`;
      item += `&security=${n.tlsEnabled ? 'tls' : ''}`;
      item += `&sni=${n.sni || ''}`;
      item += `&serviceName=${n.grpcService || ''}`;
      item += `&mode=${n.grpcMode || ''}`;
      item += `&alpn=${encodeURIComponent(n.alpn || '')}`;
      item += `#${encodeURIComponent(n.displayName)}\n`;
      url += item;
    } else if (n.sort === 0) {
      if (n.isV2 && n.address) {
        const userInfo = Buffer.from(n.encryption + ':' + n.password).toString('base64');
        url += `ss://${userInfo}@${n.address}:${n.port}#${encodeURIComponent(n.displayName)}\n`;
      } else {
        url += `ss://YWVzLTEyOC1nY206NjYwMWZiOTBlOWIz@fast.com:443#${encodeURIComponent(n.displayName)}\n`;
      }
    } else if (n.sort === 15) {
      let hy2Params = `sni=${encodeURIComponent(n.sni || n.address)}`;
      if (n.alpn) {
        hy2Params += `&alpn=${encodeURIComponent(n.alpn)}`;
      }
      if (n.hy2Obfs) {
        hy2Params += `&obfs=${encodeURIComponent(n.hy2Obfs)}`;
      }
      if (n.hy2ObfsPassword) {
        hy2Params += `&obfs-password=${encodeURIComponent(n.hy2ObfsPassword)}`;
      }
      if (n.hy2Insecure) {
        hy2Params += `&insecure=1`;
      }
      url += `hy2://${n.uuid}@${n.address}:${n.port}?${hy2Params}#${encodeURIComponent(n.displayName)}\n`;
    }
  }
  return url;
}

/**
 * Renders nodes to Clash YAML format configuration
 */
export function renderClash(nodes: NormalizedNode[], user: any): string {
  const proxies: any[] = [];
  const proxyNames: string[] = [];

  for (const n of nodes) {
    if (!n.address) continue;
    let proxy: any = null;

    if (n.sort === 11) {
      proxy = {
        name: n.displayName,
        type: 'vmess',
        server: n.address,
        port: parseInt(n.port),
        uuid: n.uuid || user.v2rayUuid || '',
        alterId: parseInt(n.alterId || '0'),
        cipher: n.security || 'auto',
        udp: true,
        network: n.transport || 'tcp'
      };

      if (n.tlsEnabled) {
        proxy.tls = true;
        proxy.servername = n.sni || n.address;
        if (n.alpn) {
          proxy.alpn = n.alpn.split(',');
        }
      }

      if (n.transport === 'ws') {
        proxy.network = 'ws';
        if (n.wsPath) {
          proxy['ws-opts'] = {
            path: n.wsPath
          };
          if (n.wsHost) {
            proxy['ws-opts'].headers = {
              Host: n.wsHost
            };
          }
        }
      } else if (n.transport === 'grpc') {
        proxy.network = 'grpc';
        if (n.grpcService) {
          proxy['grpc-opts'] = {
            'grpc-service-name': n.grpcService
          };
          if (n.grpcMode) {
            proxy['grpc-opts']['grpc-mode'] = n.grpcMode;
          }
        }
      }
    } else if (n.sort === 13) {
      proxy = {
        name: n.displayName,
        type: 'vless',
        server: n.address,
        port: parseInt(n.port),
        uuid: n.uuid || user.v2rayUuid || '',
        udp: true,
        network: n.transport || 'tcp',
        flow: n.flow || ''
      };

      if (n.tlsEnabled) {
        proxy.tls = true;
        proxy.servername = n.sni || n.address;
        if (n.alpn) {
          proxy.alpn = n.alpn.split(',');
        }
      }

      if (n.transport === 'ws') {
        if (n.wsPath) {
          proxy['ws-opts'] = {
            path: n.wsPath
          };
          if (n.wsHost) {
            proxy['ws-opts'].headers = {
              Host: n.wsHost
            };
          }
        }
      } else if (n.transport === 'grpc') {
        if (n.grpcService) {
          proxy['grpc-opts'] = {
            'grpc-service-name': n.grpcService
          };
          if (n.grpcMode) {
            proxy['grpc-opts']['grpc-mode'] = n.grpcMode;
          }
        }
      }
    } else if (n.sort === 14) {
      proxy = {
        name: n.displayName,
        type: 'trojan',
        server: n.address,
        port: parseInt(n.port),
        password: n.uuid || user.v2rayUuid || '',
        udp: true,
        network: n.transport || 'tcp'
      };

      if (n.sni) {
        proxy.sni = n.sni;
      }
      if (n.alpn) {
        proxy.alpn = n.alpn.split(',');
      }

      if (n.transport === 'ws') {
        if (n.wsPath) {
          proxy['ws-opts'] = {
            path: n.wsPath
          };
          if (n.wsHost) {
            proxy['ws-opts'].headers = {
              Host: n.wsHost
            };
          }
        }
      } else if (n.transport === 'grpc') {
        if (n.grpcService) {
          proxy['grpc-opts'] = {
            'grpc-service-name': n.grpcService
          };
          if (n.grpcMode) {
            proxy['grpc-opts']['grpc-mode'] = n.grpcMode;
          }
        }
      }
    } else if (n.sort === 0 && n.isV2 && n.address) {
      proxy = {
        name: n.displayName,
        type: 'ss',
        server: n.address,
        port: parseInt(n.port),
        cipher: n.encryption || 'aes-128-gcm',
        password: n.password,
        udp: true
      };
    } else if (n.sort === 15) {
      proxy = {
        name: n.displayName,
        type: 'hysteria2',
        server: n.address,
        port: parseInt(n.port),
        password: n.uuid || user.v2rayUuid || '',
        udp: true,
        sni: n.sni || n.address
      };
      if (n.alpn) {
        proxy.alpn = n.alpn.split(',');
      }
      if (n.hy2Obfs) {
        proxy.obfs = n.hy2Obfs;
        if (n.hy2ObfsPassword) {
          proxy['obfs-password'] = n.hy2ObfsPassword;
        }
      }
      if (n.hy2UpMbps) {
        proxy.up = n.hy2UpMbps + ' Mbps';
      }
      if (n.hy2DownMbps) {
        proxy.down = n.hy2DownMbps + ' Mbps';
      }
      if (n.hy2Insecure) {
        proxy['skip-cert-verify'] = true;
      }
    }

    if (proxy) {
      proxies.push(proxy);
      proxyNames.push(n.displayName);
    }
  }

  let yaml = "mixed-port: 7890\n";
  yaml += "allow-lan: true\n";
  yaml += "mode: rule\n";
  yaml += "log-level: info\n";
  yaml += "external-controller: 127.0.0.1:9090\n\n";

  yaml += "dns:\n";
  yaml += "  enable: true\n";
  yaml += "  listen: 0.0.0.0:53\n";
  yaml += "  enhanced-mode: fake-ip\n";
  yaml += "  nameserver:\n";
  yaml += "    - 223.5.5.5\n";
  yaml += "    - 119.29.29.29\n\n";

  yaml += "proxies:\n";
  for (const proxy of proxies) {
    yaml += "  - name: " + proxy.name + "\n";
    yaml += "    type: " + proxy.type + "\n";
    const safeServer = proxy.server.replace(/"/g, '\\"');
    yaml += "    server: \"" + safeServer + "\"\n";
    yaml += "    port: " + proxy.port + "\n";
    if (proxy.uuid !== undefined) {
      yaml += "    uuid: " + proxy.uuid + "\n";
    }
    if (proxy.password !== undefined) {
      yaml += "    password: " + proxy.password + "\n";
    }
    if (proxy.cipher !== undefined) {
      yaml += "    cipher: " + proxy.cipher + "\n";
    }
    if (proxy.alterId !== undefined) {
      yaml += "    alterId: " + proxy.alterId + "\n";
    }
    if (proxy.udp) {
      yaml += "    udp: true\n";
    }
    if (proxy.network !== undefined) {
      yaml += "    network: " + proxy.network + "\n";
    }
    if (proxy.flow !== undefined && proxy.flow !== '') {
      yaml += "    flow: " + proxy.flow + "\n";
    }
    if (proxy.sni !== undefined) {
      yaml += "    sni: " + proxy.sni + "\n";
    }
    if (proxy.tls) {
      yaml += "    tls: true\n";
      if (proxy.servername !== undefined) {
        yaml += "    servername: " + proxy.servername + "\n";
      }
    }
    if (proxy.alpn !== undefined) {
      yaml += "    alpn:\n";
      for (const alpn of proxy.alpn) {
        yaml += "      - " + alpn + "\n";
      }
    }
    if (proxy['ws-opts'] !== undefined) {
      yaml += "    ws-opts:\n";
      if (proxy['ws-opts'].path !== undefined) {
        yaml += "      path: " + proxy['ws-opts'].path + "\n";
      }
      if (proxy['ws-opts'].headers !== undefined) {
        yaml += "      headers:\n";
        for (const [key, value] of Object.entries(proxy['ws-opts'].headers)) {
          yaml += "        " + key + ": " + value + "\n";
        }
      }
    }
    if (proxy['grpc-opts'] !== undefined) {
      yaml += "    grpc-opts:\n";
      if (proxy['grpc-opts']['grpc-service-name'] !== undefined) {
        yaml += "      grpc-service-name: " + proxy['grpc-opts']['grpc-service-name'] + "\n";
      }
      if (proxy['grpc-opts']['grpc-mode'] !== undefined) {
        yaml += "      grpc-mode: " + proxy['grpc-opts']['grpc-mode'] + "\n";
      }
    }
    if (proxy.obfs !== undefined) {
      yaml += "    obfs: " + proxy.obfs + "\n";
    }
    if (proxy['obfs-password'] !== undefined) {
      yaml += "    obfs-password: " + proxy['obfs-password'] + "\n";
    }
    if (proxy.up !== undefined) {
      yaml += "    up: \"" + proxy.up + "\"\n";
    }
    if (proxy.down !== undefined) {
      yaml += "    down: \"" + proxy.down + "\"\n";
    }
    if (proxy['skip-cert-verify']) {
      yaml += "    skip-cert-verify: true\n";
    }
    yaml += "\n";
  }

  yaml += "proxy-groups:\n";
  yaml += "  - name: 🚀 节点选择\n";
  yaml += "    type: select\n";
  yaml += "    proxies:\n";
  yaml += "      - ♻️ 自动选择\n";
  for (const name of proxyNames) {
    yaml += "      - " + name + "\n";
  }
  yaml += "\n";

  yaml += "  - name: ♻️ 自动选择\n";
  yaml += "    type: url-test\n";
  yaml += "    proxies:\n";
  for (const name of proxyNames) {
    yaml += "      - " + name + "\n";
  }
  yaml += "    url: http://www.gstatic.com/generate_204\n";
  yaml += "    interval: 300\n\n";

  yaml += "  - name: 🎯 全球直连\n";
  yaml += "    type: select\n";
  yaml += "    proxies:\n";
  yaml += "      - DIRECT\n\n";

  yaml += "  - name: 🛑 全球拦截\n";
  yaml += "    type: select\n";
  yaml += "    proxies:\n";
  yaml += "      - REJECT\n\n";

  yaml += "rules:\n";
  yaml += "  - DOMAIN-SUFFIX,local,DIRECT\n";
  yaml += "  - IP-CIDR,127.0.0.0/8,DIRECT\n";
  yaml += "  - IP-CIDR,172.16.0.0/12,DIRECT\n";
  yaml += "  - IP-CIDR,192.168.0.0/16,DIRECT\n";
  yaml += "  - GEOIP,CN,DIRECT\n";
  yaml += "  - MATCH,🚀 节点选择\n";

  return yaml;
}

/**
 * Renders nodes to Singbox JSON configuration
 */
export function renderSingBox(nodes: NormalizedNode[], user: any): string {
  const nodeOutbounds: any[] = [];
  const nodeTags: string[] = [];

  for (const n of nodes) {
    if (!n.address) continue;
    if (n.sort === 11 && n.transport === 'xhttp') {
      continue;
    }

    let outbound: any = null;

    if (n.sort === 11) {
      outbound = {
        type: 'vmess',
        tag: n.displayName,
        server: n.address,
        server_port: parseInt(n.port),
        uuid: n.uuid || user.v2rayUuid || '',
        security: n.security || 'auto',
        alter_id: parseInt(n.alterId || '0')
      };

      if (n.transport && ['ws', 'grpc', 'http', 'quic', 'httpupgrade'].includes(n.transport)) {
        const transport: any = { type: n.transport };
        if (n.transport === 'ws') {
          if (n.wsPath) transport.path = n.wsPath;
          if (n.wsHost) transport.headers = { Host: n.wsHost };
        } else if (n.transport === 'grpc' && n.grpcService) {
          transport.service_name = n.grpcService;
        } else if (n.transport === 'http') {
          if (n.wsPath) transport.path = n.wsPath;
          if (n.wsHost) transport.host = [n.wsHost];
        } else if (n.transport === 'httpupgrade') {
          if (n.wsPath) transport.path = n.wsPath;
          if (n.wsHost) transport.host = n.wsHost;
        }
        outbound.transport = transport;
      }

      if (n.tlsEnabled) {
        outbound.tls = {
          enabled: true,
          server_name: n.sni || n.address,
          insecure: false
        };
        if (n.alpn) {
          outbound.tls.alpn = n.alpn.split(',');
        }
      }
    } else if (n.sort === 13) {
      let flow = n.flow || '';
      if (flow && flow.includes('vision')) {
        flow = 'xtls-rprx-vision';
      }

      outbound = {
        type: 'vless',
        tag: n.displayName,
        server: n.address,
        server_port: parseInt(n.port),
        uuid: n.uuid || user.v2rayUuid || '',
        flow: flow,
        packet_encoding: 'xudp'
      };

      if (n.transport && ['ws', 'grpc', 'http', 'quic'].includes(n.transport)) {
        const transport: any = { type: n.transport };
        if (n.transport === 'ws') {
          if (n.wsPath) transport.path = n.wsPath;
          if (n.wsHost) transport.headers = { Host: n.wsHost };
        } else if (n.transport === 'grpc' && n.grpcService) {
          transport.service_name = n.grpcService;
        } else if (n.transport === 'http') {
          if (n.wsPath) transport.path = n.wsPath;
          if (n.wsHost) transport.host = [n.wsHost];
        }
        outbound.transport = transport;
      }

      if (n.tlsEnabled) {
        const tlsConfig: any = {
          enabled: true,
          server_name: n.sni || n.address,
          insecure: false
        };
        if (flow === 'xtls-rprx-vision') {
          tlsConfig.utls = {
            enabled: true,
            fingerprint: 'chrome'
          };
        }
        if (n.alpn) {
          tlsConfig.alpn = n.alpn.split(',');
        }
        outbound.tls = tlsConfig;
      }
    } else if (n.sort === 14) {
      outbound = {
        type: 'trojan',
        tag: n.displayName,
        server: n.address,
        server_port: parseInt(n.port),
        password: n.uuid || user.v2rayUuid || ''
      };

      if (n.transport && ['ws', 'grpc', 'http', 'quic'].includes(n.transport)) {
        const transport: any = { type: n.transport };
        if (n.transport === 'ws') {
          if (n.wsPath) transport.path = n.wsPath;
          if (n.wsHost) transport.headers = { Host: n.wsHost };
        } else if (n.transport === 'grpc' && n.grpcService) {
          transport.service_name = n.grpcService;
        } else if (n.transport === 'http') {
          if (n.wsPath) transport.path = n.wsPath;
          if (n.wsHost) transport.host = [n.wsHost];
        }
        outbound.transport = transport;
      }

      const tlsConfig: any = {
        enabled: true,
        server_name: n.sni || n.address,
        insecure: false
      };
      if (n.alpn) {
        tlsConfig.alpn = n.alpn.split(',');
      }
      outbound.tls = tlsConfig;
    } else if (n.sort === 0 && n.isV2 && n.address) {
      outbound = {
        type: 'shadowsocks',
        tag: n.displayName,
        server: n.address,
        server_port: parseInt(n.port),
        method: n.encryption || 'aes-128-gcm',
        password: user.passwd || ''
      };
    } else if (n.sort === 15) {
      outbound = {
        type: 'hysteria2',
        tag: n.displayName,
        server: n.address,
        server_port: parseInt(n.port),
        password: n.uuid || user.v2rayUuid || ''
      };

      const tlsConfig: any = {
        enabled: true,
        server_name: n.sni || n.address,
        insecure: !!n.hy2Insecure
      };
      if (n.alpn) {
        tlsConfig.alpn = n.alpn.split(',');
      }
      outbound.tls = tlsConfig;

      if (n.hy2Obfs) {
        outbound.obfs = {
          type: n.hy2Obfs,
          password: n.hy2ObfsPassword || ''
        };
      }

      if (n.hy2UpMbps) {
        outbound.up_mbps = parseInt(n.hy2UpMbps);
      }
      if (n.hy2DownMbps) {
        outbound.down_mbps = parseInt(n.hy2DownMbps);
      }
    }

    if (outbound) {
      nodeOutbounds.push(outbound);
      nodeTags.push(n.displayName);
    }
  }

  const nodeDomains: Record<string, boolean> = {};
  for (const n of nodes) {
    if (n.address) {
      const parts = n.address.split('.');
      if (parts.length >= 2) {
        const rootDomain = parts[parts.length - 2] + '.' + parts[parts.length - 1];
        nodeDomains[rootDomain] = true;
      }
    }
  }
  const uniqueDomains = Object.keys(nodeDomains);

  const outbounds: any[] = [];
  const defaultNode = nodeTags.length > 0 ? nodeTags[0] : 'DIRECT';
  outbounds.push({
    type: 'selector',
    tag: '🚀 节点选择',
    outbounds: ['DIRECT', ...nodeTags],
    default: defaultNode
  });

  for (const o of nodeOutbounds) {
    outbounds.push(o);
  }

  outbounds.push({
    type: 'direct',
    tag: 'DIRECT'
  });

  const config = {
    log: {
      level: 'info',
      timestamp: true
    },
    dns: {
      servers: [
        {
          tag: 'dns-local',
          address: '223.5.5.5',
          detour: 'DIRECT'
        },
        {
          tag: 'dns-remote',
          address: 'https://8.8.8.8/dns-query',
          address_resolver: 'dns-local',
          detour: '🚀 节点选择'
        }
      ],
      rules: [
        {
          domain_suffix: ['.cn', ...uniqueDomains.map(d => '.' + d)],
          server: 'dns-local'
        }
      ],
      final: 'dns-remote'
    },
    inbounds: [
      {
        type: 'tun',
        tag: 'tun-in',
        interface_name: 'tun0',
        inet4_address: '172.19.0.1/30',
        auto_route: true,
        strict_route: true
      }
    ],
    outbounds: outbounds,
    route: {
      rules: [
        { action: 'sniff' },
        { protocol: 'dns', action: 'hijack-dns' },
        { ip_cidr: ['8.8.8.8/32'], outbound: '🚀 节点选择' },
        { ip_is_private: true, outbound: 'DIRECT' },
        { domain_suffix: ['.cn'], outbound: 'DIRECT' },
        { clash_mode: 'Direct', outbound: 'DIRECT' }
      ],
      auto_detect_interface: true,
      final: '🚀 节点选择'
    },
    experimental: {
      cache_file: {
        enabled: true,
        path: 'cache.db'
      }
    }
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Renders nodes to Loon format configuration
 */
export function renderLoon(nodes: NormalizedNode[], user: any): string {
  let config = "";
  for (const n of nodes) {
    if (!n.address) continue;
    if (n.sort === 15) continue; // Loon doesn't support Hy2, skip

    const nodeName = n.displayName;

    if (n.sort === 11) {
      config += "[VMess]\n";
      config += "name = " + nodeName + "\n";
      config += "server = " + n.address + "\n";
      config += "port = " + n.port + "\n";
      config += "uuid = " + (n.uuid || user.v2rayUuid || '') + "\n";
      config += "alterId = " + (n.alterId || '0') + "\n";
      config += "security = " + (n.security || "auto") + "\n";
      config += "udp = true\n";
      if (n.transport) {
        config += "network = " + n.transport + "\n";
      }
      if (n.tlsEnabled) {
        config += "tls = true\n";
        if (n.sni) {
          config += "sni = " + n.sni + "\n";
        }
      }
      if (n.transport === "ws" && n.wsPath) {
        config += "ws-path = " + n.wsPath + "\n";
        if (n.wsHost) {
          config += "ws-headers = Host:" + n.wsHost + "\n";
        }
      }
      config += "\n";
    } else if (n.sort === 13) {
      config += "[VLESS]\n";
      config += "name = " + nodeName + "\n";
      config += "server = " + n.address + "\n";
      config += "port = " + n.port + "\n";
      config += "uuid = " + (n.uuid || user.v2rayUuid || '') + "\n";
      config += "udp = true\n";
      if (n.flow) {
        config += "flow = " + n.flow + "\n";
      }
      if (n.transport) {
        config += "network = " + n.transport + "\n";
      }
      if (n.tlsEnabled) {
        config += "tls = true\n";
        if (n.sni) {
          config += "sni = " + n.sni + "\n";
        }
      }
      if (n.transport === "ws" && n.wsPath) {
        config += "ws-path = " + n.wsPath + "\n";
        if (n.wsHost) {
          config += "ws-headers = Host:" + n.wsHost + "\n";
        }
      }
      config += "\n";
    } else if (n.sort === 14) {
      config += "[Trojan]\n";
      config += "name = " + nodeName + "\n";
      config += "server = " + n.address + "\n";
      config += "port = " + n.port + "\n";
      config += "password = " + (n.uuid || user.v2rayUuid || '') + "\n";
      config += "udp = true\n";
      if (n.sni) {
        config += "sni = " + n.sni + "\n";
      }
      if (n.transport) {
        config += "network = " + n.transport + "\n";
      }
      if (n.transport === "ws" && n.wsPath) {
        config += "ws-path = " + n.wsPath + "\n";
        if (n.wsHost) {
          config += "ws-headers = Host:" + n.wsHost + "\n";
        }
      }
      config += "\n";
    } else if (n.sort === 0 && n.isV2 && n.address) {
      config += "[Shadowsocks]\n";
      config += "name = " + nodeName + "\n";
      config += "server = " + n.address + "\n";
      config += "port = " + n.port + "\n";
      config += "encrypt-method = " + (n.encryption || "aes-128-gcm") + "\n";
      config += "password = " + (user.passwd || '') + "\n";
      config += "udp = true\n";
      config += "\n";
    }
  }

  config += "[Policy]\n";
  config += "name = 🚀 节点选择\n";
  config += "type = select\n\n";

  config += "[General]\n";
  config += "log-level = notify\n";
  config += "allow-wifi-access = false\n";
  config += "skip-proxy = 192.168.0.0/16, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8\n";
  config += "ipv6 = true\n";
  config += "dns-server = 223.5.5.5, 119.29.29.29\n";
  config += "dns-server-system = true\n\n";

  return config;
}

/**
 * Renders nodes to Surfboard format configuration
 */
export function renderSurfboard(nodes: NormalizedNode[], user: any): string {
  let config = "";
  const proxyNames: string[] = [];

  for (const n of nodes) {
    if (!n.address) continue;
    if (n.sort === 15) continue; // Hysteria2 not supported

    const nodeName = n.displayName;

    if (n.sort === 11) {
      config += "VMess, " + nodeName + ", " + n.address + ", " + n.port;
      config += ", " + (n.uuid || user.v2rayUuid || '');
      config += ", " + (n.alterId || '0');
      config += ", " + (n.security || "auto");
      config += ", " + (n.transport || "tcp");
      config += ", \"" + (n.wsPath || "") + "\"";
      config += ", \"" + (n.wsHost || "") + "\"";
      if (n.tlsEnabled) {
        config += ", true";
        if (n.sni) {
          config += ", " + n.sni;
        }
      }
      config += "\n";
      proxyNames.push(nodeName);
    } else if (n.sort === 13) {
      config += "VLESS, " + nodeName + ", " + n.address + ", " + n.port;
      config += ", " + (n.uuid || user.v2rayUuid || '');
      config += ", " + (n.transport || "tcp");
      config += ", \"" + (n.wsPath || "") + "\"";
      config += ", \"" + (n.wsHost || "") + "\"";
      if (n.tlsEnabled) {
        config += ", true";
        if (n.sni) {
          config += ", " + n.sni;
        }
      }
      if (n.flow) {
        config += ", " + n.flow;
      }
      config += "\n";
      proxyNames.push(nodeName);
    } else if (n.sort === 14) {
      config += "Trojan, " + nodeName + ", " + n.address + ", " + n.port;
      config += ", " + (n.uuid || user.v2rayUuid || '');
      if (n.transport) {
        config += ", " + n.transport;
      }
      if (n.wsPath) {
        config += ", \"" + n.wsPath + "\"";
      }
      if (n.wsHost) {
        config += ", \"" + n.wsHost + "\"";
      }
      if (n.sni) {
        config += ", " + n.sni;
      }
      config += "\n";
      proxyNames.push(nodeName);
    } else if (n.sort === 0 && n.isV2 && n.address) {
      config += "Shadowsocks, " + nodeName + ", " + n.address + ", " + n.port;
      config += ", " + (n.encryption || "aes-128-gcm");
      config += ", " + (user.passwd || '');
      config += "\n";
      proxyNames.push(nodeName);
    }
  }

  config += "\n[Proxy Group]\n";
  config += "🚀 节点选择, select";
  for (const name of proxyNames) {
    config += ", " + name;
  }
  config += "\n";

  config += "♻️ 自动选择, url-test";
  for (const name of proxyNames) {
    config += ", " + name;
  }
  config += ", url = http://www.gstatic.com/generate_204, interval = 300\n";

  config += "🎯 全球直连, select, DIRECT\n";
  config += "🛑 全球拦截, select, REJECT\n";

  config += "\n[Rule]\n";
  config += "DOMAIN-SUFFIX, local, DIRECT\n";
  config += "IP-CIDR, 127.0.0.0/8, DIRECT\n";
  config += "IP-CIDR, 172.16.0.0/12, DIRECT\n";
  config += "IP-CIDR, 192.168.0.0/16, DIRECT\n";
  config += "GEOIP, CN, DIRECT\n";
  config += "MATCH, 🚀 节点选择\n";

  config += "\n[General]\n";
  config += "log-level = notify\n";
  config += "dns-server = 223.5.5.5, 119.29.29.29\n";
  config += "allow-wifi-access = false\n\n";

  return config;
}

/**
 * Renders nodes to Quantumult X format configuration (returns Base64 text)
 */
export function renderQuanX(nodes: NormalizedNode[], user: any): string {
  const lines: string[] = [];

  for (const n of nodes) {
    if (!n.address) continue;
    if (n.sort === 15) continue; // Hysteria2 not supported

    const nodeName = n.displayName.replace(/ /g, "_");
    let line = "";

    if (n.sort === 0 && n.isV2 && n.address) {
      const method = n.encryption || "aes-128-gcm";
      const password = user.passwd || '';
      line = "shadowsocks=" + n.address + ":" + n.port;
      line += ", method=" + method;
      line += ", password=" + password;
      if (n.transport === "ws") {
        if (n.tlsEnabled) {
          line += ", obfs=wss";
        } else {
          line += ", obfs=ws";
        }
        if (n.wsPath) {
          line += ", obfs-uri=" + n.wsPath;
        }
        if (n.wsHost) {
          line += ", obfs-host=" + n.wsHost;
        }
      } else if (n.tlsEnabled) {
        line += ", obfs=over-tls";
        const sniHost = n.sni || n.address;
        line += ", obfs-host=" + sniHost;
        line += ", tls-verification=true";
      }
      line += ", fast-open=false, udp-relay=true";
      line += ", tag=" + nodeName;
    } else if (n.sort === 11) {
      if (['grpc', 'xhttp'].includes(n.transport || '')) {
        continue;
      }
      const uuid = n.uuid || user.v2rayUuid || '';
      const method = (n.security && n.security !== "auto") ? n.security : "chacha20-ietf-poly1305";

      line = "vmess=" + n.address + ":" + n.port;
      line += ", method=" + method;
      line += ", password=" + uuid;

      const hasTls = n.tlsEnabled;
      if (n.transport === "ws") {
        if (hasTls) {
          line += ", obfs=wss";
        } else {
          line += ", obfs=ws";
        }
        if (n.wsHost) {
          line += ", obfs-host=" + n.wsHost;
        }
        if (n.wsPath) {
          line += ", obfs-uri=" + n.wsPath;
        }
      } else if (hasTls) {
        line += ", obfs=over-tls";
        const sniHost = n.sni || n.address;
        line += ", obfs-host=" + sniHost;
        line += ", tls-verification=true";
      }

      line += ", fast-open=false, udp-relay=true";
      line += ", tag=" + nodeName;
    } else if (n.sort === 13) {
      if (['grpc', 'xhttp'].includes(n.transport || '')) {
        continue;
      }
      const uuid = n.uuid || user.v2rayUuid || '';
      const isVision = !!n.flow && n.flow.includes("vision");

      line = "vless=" + n.address + ":" + n.port;
      line += ", method=none";
      line += ", password=" + uuid;

      const hasTls = n.tlsEnabled;
      if (n.transport === "ws") {
        if (hasTls) {
          line += ", obfs=wss";
        } else {
          line += ", obfs=ws";
        }
        if (n.wsHost) {
          line += ", obfs-host=" + n.wsHost;
        }
        if (n.wsPath) {
          line += ", obfs-uri=" + n.wsPath;
        }
      } else if (hasTls) {
        line += ", obfs=over-tls";
        const sniHost = n.sni || n.address;
        line += ", obfs-host=" + sniHost;
        line += ", tls-verification=true";
      }

      if (isVision) {
        line += ", vless-flow=xtls-rprx-vision";
      }

      line += ", fast-open=false, udp-relay=true";
      line += ", tag=" + nodeName;
    } else if (n.sort === 14) {
      const uuid = n.uuid || user.v2rayUuid || '';
      const sniHost = n.sni || n.address;

      line = "trojan=" + n.address + ":" + n.port;
      line += ", password=" + uuid;

      if (n.transport === "ws") {
        line += ", obfs=wss";
        line += ", obfs-host=" + (n.wsHost || sniHost);
        if (n.wsPath) {
          line += ", obfs-uri=" + n.wsPath;
        }
      } else {
        line += ", over-tls=true";
        line += ", tls-host=" + sniHost;
        line += ", tls-verification=true";
      }

      line += ", fast-open=false, udp-relay=true";
      line += ", tag=" + nodeName;
    }

    if (line) {
      lines.push(line);
    }
  }

  if (lines.length === 0) return "";
  const content = lines.join("\n") + "\n";
  return Buffer.from(content).toString('base64');
}
