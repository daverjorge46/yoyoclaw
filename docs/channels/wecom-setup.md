# 企业微信回调URL配置完整指南

## 企业微信凭证信息配置

### 配置项说明

在使用企业微信集成之前,您需要从企业微信管理后台获取以下凭证:

| 配置项 | 说明 | 获取位置 |
|--------|------|----------|
| **Corp ID** | 企业ID | 企业微信管理后台 > 我的企业 |
| **Agent ID** | 应用ID | 应用管理 > 自建应用 > 凭证与基础信息 |
| **Secret** | 应用密钥 | 应用管理 > 自建应用 > 凭证与基础信息 |

### 示例配置

```json
{
  "corpId": "ww7d9accf2f62cf60f",
  "agentId": "1000018",
  "secret": "VCKoO_FXf7E6hGn1bLjRuac5_p0ewiFxinAcDTbFDUE"
}
```

---

## 前提条件

### ⚠️ 重要: 公网IP要求

企业微信回调URL需要能够被企业微信服务器访问,因此您需要:

1. **具有公网IP的服务器** - 家用电脑通常没有公网IP
2. **开放端口18789** - 在防火墙/安全组中开放此端口

#### 检查您的公网IP

```bash
# 方法1
curl ifconfig.me

# 方法2
curl ipinfo.io/ip
```

#### 如果没有公网IP怎么办?

**选项 A: 购买云服务器**
- 阿里云、腾讯云、UCloud等
- UCloud提供Moltbot一键部署镜像
- 价格约 ¥30-100/月

**选项 B: 使用内网穿透工具**
- ngrok (免费版有限制)
- frp (需要有自己的服务器)
- Tailscale (点对点连接,需要两端都安装)

---

## 步骤 1: 在企业微信管理后台创建机器人

### 1.1 登录企业微信管理后台

访问: https://work.weixin.qq.com/

使用具有企业管理员权限的账号登录。

### 1.2 创建机器人

1. 导航至: **安全与管理 > 管理工具**
2. 点击 **"创建机器人"** 按钮
3. 滑到页面底部,点击 **"API模式创建"** 按钮

### 1.3 填写机器人信息

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **名称** | Moltbot助手 | 自定义名称 |
| **简介** | AI企业助手 | 自定义简介 |
| **可见范围** | 选择部门/成员 | 谁可以使用此机器人 |
| **URL** | `http://12.12.12.12:18789/wecom` | ⚠️ 替换为您的实际公网IP |
| **Token** | 点击"随机获取"按钮 | 自动生成 |
| **EncodingAESKey** | 点击"随机获取"按钮 | 自动生成(43位字符串) |

#### URL格式说明

```
http://公网IP地址:18789/wecom
```

**示例:**
假设您的公网IP地址是 `12.12.12.12`,那么URL应该是:
```
http://12.12.12.12:18789/wecom
```

### 1.4 重要提示

⚠️ **暂时不要点击"创建"按钮**

先保存生成的 Token 和 EncodingAESKey,后续配置Moltbot时会用到。

---

## 步骤 2: 配置Moltbot

### 2.1 打开Moltbot Web UI

访问: http://127.0.0.1:18789/

### 2.2 修改配置文件

1. 点击 **Settings** → **Config** → **Authentication**
2. 在页面底部选择 **Raw** 查看方式
3. 找到或添加以下配置:

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "webhookPath": "/wecom",
      "token": "从企业微信页面复制的Token",
      "encodingAESKey": "从企业微信页面复制的EncodingAESKey",
      "receiveId": "",
      "dm": {
        "policy": "pairing"
      }
    }
  }
}
```

### 2.3 配置示例

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "webhookPath": "/wecom",
      "token": "moltbot_wecom_2026_randomstring",
      "encodingAESKey": "abcdefghijklmnopqrstuvwxyzABCDE1234567",
      "receiveId": "",
      "dm": {
        "policy": "pairing"
      }
    }
  }
}
```

### 2.4 保存并应用配置

1. 点击 **Save** 保存配置
2. 点击 **Update** 更新配置
3. 重启网关:

```bash
# 方法1: 使用命令行
moltbot gateway restart

# 方法2: 使用pnpm
pnpm moltbot gateway restart
```

---

## 步骤 3: 完成企业微信机器人创建

### 3.1 回到企业微信管理后台

返回之前的机器人创建页面。

### 3.2 创建机器人

1. 点击 **"创建"** 按钮
2. 创建成功后,会显示二维码

### 3.3 添加机器人

1. 用企业微信手机APP扫码添加机器人
2. 或者在企业微信PC端搜索机器人名称添加
3. 添加完成后,即可在聊天窗口中与机器人对话

---

## 步骤 4: 验证配置

### 4.1 检查Moltbot状态

```bash
moltbot channels status
```

**预期输出:**
```
Gateway reachable.
- WeCom default: enabled, configured, running
```

### 4.2 测试机器人

在企业微信中发送测试消息:

```
你好
```

如果配置正确,机器人应该会回复。

---

## 常见问题

### 1. 配置验证失败

**检查清单:**
- ✅ 公网IP是否正确
- ✅ 端口18789是否开放 (防火墙/安全组)
- ✅ Moltbot网关是否正在运行
- ✅ Token和EncodingAESKey是否完全一致

### 2. 查看日志

```bash
# 查看网关日志
tail -f /tmp/moltbot/moltbot-*.log

# 查看企业微信相关日志
tail -f /tmp/moltbot/moltbot-*.log | grep -i wecom
```

### 3. 机器人无响应

**可能原因:**
1. 网关未启动 - 检查 `moltbot gateway status`
2. 端口未开放 - 检查防火墙配置
3. 回调URL错误 - 确认格式为 `http://公网IP:18789/wecom`
4. 凭证不匹配 - 重新检查Token和EncodingAESKey

---

## 高级配置

### DM策略配置

`dm.policy` 支持以下选项:

| 策略 | 说明 |
|------|------|
| `open` | 任何人都可以直接与机器人对话 |
| `pairing` | 需要配对后才能对话 (推荐) |
| `allowlist` | 仅允许列表中的用户对话 |

### 允许列表配置

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "webhookPath": "/wecom",
      "token": "your_token",
      "encodingAESKey": "your_encoding_aes_key",
      "receiveId": "",
      "dm": {
        "policy": "allowlist",
        "allowFrom": ["user1", "user2"]
      }
    }
  }
}
```

---

## 安全建议

1. **使用HTTPS** - 生产环境建议使用HTTPS回调URL
2. **保护密钥** - 不要将Token和EncodingAESKey提交到版本控制
3. **限制访问** - 使用allowlist策略限制机器人访问
4. **定期轮换** - 定期更换Token和EncodingAESKey

---

## 参考资料

### 官方文档
- [企业微信回调配置官方文档](https://developer.work.weixin.qq.com/document/path/90930)
- [接收消息和事件](https://developer.work.weixin.qq.com/document/path/94670)
- [回调和回复的加解密方案](https://developer.work.weixin.qq.com/document/path/101033)
- [发送应用消息](https://developer.work.weixin.qq.com/document/path/90236)

### 社区资源
- [MoltBot完整安装指南](https://www.cnblogs.com/runyuai/p/19547053)
- [企业微信开发实战](https://cloud.tencent.com/developer/article/2024020)
- [.NET企业微信回调配置](https://www.cnblogs.com/Can-daydayup/p/15228111.html)

---

## 附录: 完整配置示例

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "webhookPath": "/wecom",
      "token": "随机生成的Token",
      "encodingAESKey": "随机生成的43位EncodingAESKey",
      "receiveId": "",
      "dm": {
        "policy": "pairing"
      },
      "allowFrom": []
    }
  },
  "gateway": {
    "bind": "0.0.0.0",
    "port": 18789
  }
}
```

---

**最后更新:** 2026-01-29
**文档版本:** 1.0.0