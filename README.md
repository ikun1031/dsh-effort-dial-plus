# Effort Dial Plus

Codex 风格的推理强度卡片，替换 DeepSeek Harness 输入框里的模型选择器：一个控件同时管模型和思考档位。

![最高档](docs/screenshot-max.png)

## 功能

- **一个控件管两件事**：点模型行切模型，拖滑杆切推理档位，不用在菜单里来回翻。
- **最高档提示**：拖到最高档时，卡片标题换成额度提示行（默认「更快消耗使用额度」），约两秒后交还给档位名；滑杆同时从纯色切成蓝紫渐变并浮出流动粒子，越过顶档瞬间有一次亮度脉冲。
- **逐档变色**：强调色从宿主品牌色线性过渡到紫色，闪电、标题、滑杆填充、输入框里的档位文字共用同一个档位色，升一档就能看出变化。
- **跟随主题**：面板、轨道、刻度、拇指、文字全部取自 DSH 主题令牌，亮/暗主题自动适配；紫色在浅色主题下会自动加深一档。
- **跟手的拖动**：浮点位置跟随指针，档位附近磁吸，按下即预览、松手才提交；拖动期间关闭过渡并缓存轨道尺寸，不逐帧重排。键盘 `← →` / `↑ ↓` 逐档，`Home` / `End` 到两端，`Esc` 关闭。
- **模型列表**：点模型行进入按供应商分组的列表，勾选即切换，切换后自动对齐目标模型的默认档位。
- **可调**：DSH 设置里有单独一页，能改提示文案、贴纸显隐、磁吸强度、面板宽度，还有一块自定义 CSS，写的规则会覆盖插件默认样式。

## 安装

需要 DSH `>= 0.1.0-rc.5`。

从插件市场搜索 **Effort Dial Plus** 安装，或直接指定仓库：

```sh
dsh plugin --profile <profile> add github:ikun1031/dsh-effort-dial-plus
```

本地开发时可以直接指向目录：

```sh
dsh plugin --profile <profile> add /path/to/dsh-effort-dial-plus
```

安装后刷新页面即可。**替换 `client.js` 后需要重启宿主**：客户端包在激活时会把字节缓存在内存里，只刷新页面拿不到新代码；安装新版本则刷新即可。

## 设置

DSH 设置 → **推理强度拨盘**：

| 项 | 说明 |
|---|---|
| 警告只显示一次 | 关（默认）时每次进入最高档都提示；打开后只提示一次 |
| 流动粒子 | 最高档滑杆上的星点开关 |
| 逐档变色 | 关闭后强调色固定为宿主品牌色 |
| 磁吸强度 | 0～0.35 档，0 为完全跟手 |
| 面板宽度 | 220～360px |
| 警告文案 | 提示行的文字，默认「更快消耗使用额度」 |
| 高级 · 自定义 CSS | 注入到 `<head>` 末尾，可覆盖任意 `.edp-*` 样式 |

全部存在浏览器 `localStorage`，改完立即生效。

## 兼容性

- 占用 composer 的 `conversation.input.model` 槽位（priority -1 遮蔽出厂选择器），与 `dsh-effort-dial`、`reasoning-slider`、`dsh-codex-effort-slider` 这类同槽位插件互斥，同时启用会互相遮蔽。
- 纯客户端插件，不请求网络，不上报任何数据。
- 无档位信息的模型会显示说明而不是空白卡片；模型目录读取失败时会自动退避重试并把错误显示在卡片里。

## 结构

```
dsh-effort-dial-plus/
├── index.js            # 宿主半（空 apply）
├── client.js           # 浏览器半：卡片、滑杆、模型列表、粒子
├── cordis.patch.yml    # 一行 host row
├── locale/{en,zh}.json # 插件管理器里的标题与描述
├── icon.svg            # 图标
├── assets/icon-180.png # 市场卡片用图
└── docs/screenshot-max.png
```

`client.js` 是 `window.__ModuleLoader__.load({ id, factory })` 格式的普通 JavaScript，无构建步骤；React 从宿主模块表 `require('react')` 取，样式在工厂执行时注入。

## 许可

MIT。

## 致谢

交互参考 Codex 官方的推理强度卡片；最高档的粒子与渐变思路参考社区插件 [reasoning-slider](https://github.com/qjcnmd/dsh-reasoning-slider)，卡片结构参考 [dsh-effort-dial](https://github.com/Lushdawn/dsh-effort-dial)，两者均为 MIT 许可。
