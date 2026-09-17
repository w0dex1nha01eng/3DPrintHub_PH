# PrintHub

部署在校园网内网的 STL / 3MF 模型接单网站。校内用户上传模型、选择耗材与颜色、提交联系方式；管理员审核、下载模型、确认报价并安排打印。模型和数据保存在服务端。
## 当前功能

- 客户端：STL / 3MF 文件选择、拖放、3D 预览、逐模型尺寸检查、上传进度、订单回执、进度查询、价格表、须知与联系页。
- 独立管理端：管理员登录，按材料种类管理具体耗材（品牌、型号、颜色名称、色号、RGB、特性、每克价格），编辑联系方式、页面文案、须知和常见问题；支持订单管理及后台模型的检索、下载和确认删除。
- 后端：真实保存配置、订单与模型，检查文件内容、尺寸、上传凭证和管理权限。不是本地浏览器假保存。
- 默认耗材只有 PLA、PETG，可在管理端调整；最终价格仍需切片后人工确认。

## 单模型上限

创想三维 K1C 官方成型尺寸为 **220 × 220 × 250 mm（X/Y/Z）**。[官方规格](https://www.creality.com/products/k1c-carbon-3d-printer)

每个上传文件必须同时满足：

1. STL / 3MF 文件格式有效，单文件不超过 100 MB。
2. STL 按毫米解释，3MF 按声明单位换算并应用装配变换；X/Y/Z 外包尺寸分别不超过 220/220/250 mm。
3. 恰好等于尺寸上限允许；任意一轴超过上限拒绝，不自动缩放、旋转或排序轴。
4. 每个文件单独检查，不累计多个文件的尺寸，也不按打印数量放大尺寸。多实体 STL 和 3MF 装配均检查整体外包尺寸；多盘工程请拆分导出。

每单默认最多 5 个模型。超过 20 MB 仅跳过 3D 预览，**仍然检查尺寸**。前端检查整批文件后再上传，后端重新独立解析，不能靠绕过页面上传超限模型。

3MF 支持普通三角网格及跨文件装配，预览使用所选耗材颜色，管理员下载保持原始 3MF。3MF 不一定已切片，STL 也不是切片指令；平台不执行包内 G-code 或直接采用其打印配置。仅含切片指令、损坏或超出解析资源限制的文件拒收，解析逻辑见 `backend/app/three_mf.py`。

尺寸合格不保证可打印：封闭性、水密性、薄壁、悬垂、支撑、裙边与实际摆放余量仍需人工审核。

## 配置与注释

关键配置、金额单位、初始化行为和尺寸校验均有简短中文注释。

| 配置内容 | 修改位置 |
| --- | --- |
| 耗材种类、品牌、型号、色号、RGB、特性、每克价格 | 管理端“耗材管理”，保存到 SQLite |
| 联系方式、页面文案、打印须知、常见问题 | 管理端“客户端内容”，保存后同步 |
| 首次建库的默认材料与颜色 | `backend/app/database.py`，仅新建数据库时读取 |
| 模型尺寸硬上限 | `backend/app/config.py` 与 `frontend/src/config/site.js`，当前锁定 K1C |
| 文件字节上限、数量、数据目录 | `backend/app/config.py`、`backend/.env`；客户端自动读取 |
| 网站名称、预览阈值 | `frontend/src/config/site.js` |
| 客户端外观 | `frontend/src/styles/main.css` |
| 管理端外观 | `admin-frontend/src/styles/admin.css` |


## 架构与数据

```text
客户端 frontend/      独立管理端 admin-frontend/
     |                      |
     +------ /api/ ---------+
                 |
       Python FastAPI + SQLAlchemy
                 |
     SQLite + 私有 STL / 3MF 文件目录
```

SQLite 默认在 `backend/data/campus_print.db`，模型在 `backend/data/uploads/`。

- `catalog`：耗材、颜色、整数分单价与配置版本。
- `site_content`：联系方式、页面文案、须知与常见问题，与目录使用同一保存事务和版本号。
- `admin_users`：管理员账号和带盐 scrypt 密码哈希。
- `orders`：订单、状态、查询凭证哈希、下单时的配置快照。
- `model_files`：文件名、字节数、实测尺寸、上传凭证哈希、订单关联及删除时间。删除 STL/3MF 后仍保留历史记录。

管理配置变动会同步到客户页面；订单保留下单快照，历史材料名称与参考价不会被后续编辑改变。

## 本地启动

需要 Node.js 22.12+ 和 Python 3.11+。先启动后端：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.bootstrap
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

再分别进入 `frontend` 和 `admin-frontend`，执行 `npm ci`、`npm run dev`。客户端默认使用 5173 端口，管理端默认使用 5174 端口。

本地数据库、上传模型、环境变量和构建结果不会提交到仓库。

## 内网部署

构建两套前端，由 Nginx 分别托管 `/` 与 `/admin/`，将 `/api/` 转发到本机 FastAPI。数据库和上传目录不能被静态访问，模型下载需要管理员身份验证。

正式上线需配置 HTTPS、校园网/IP 访问限制、请求限速和磁盘配额。HTTP Basic 密码在未加密的 HTTP 网络上并不安全。数据库和模型要成套备份，运行中的 SQLite WAL 数据也需妥善处理。

当前尚未接入打印机控制、自动切片、最终报价录入、通知、自动过期文件清理或 Alembic 迁移。本次内置一次幂等兼容升级：旧颜色转换为各材料下的耗材，新增内容表及文件删除标记，历史订单和原有价格保持不变。未来数据库变更仍需显式迁移，升级前须备份。
