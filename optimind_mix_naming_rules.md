# PostgreSQL `optimind_mix` 命名規則

更新日期：2026-05-29  
適用範圍：`optimind_mix` PostgreSQL database  
目前主要模組：Postoria / 明信片收藏

## 1. 命名原則

所有資料庫物件命名原則：

- 使用小寫英文與底線：`snake_case`
- 不使用空白、中文、特殊符號
- 表格名稱要能看出資料類型與模組
- 欄位名稱要能看出用途
- 主鍵與關聯鍵統一使用 UUID
- 多公司資料需使用 `company_uid` 隔離

## 2. 資料表命名

資料表名稱格式：

```text
{table_type}_{module_name}_{entity_name}
```

例如：

```text
b_postoria_member
b_postoria_postcard
t_postoria_member_favorite
t_postoria_postcard_upload
```

## 3. 表格前綴

| 前綴 | 意義 | 說明 |
|---|---|---|
| `b_` | Basic / 基本資料 | 主資料、基本資料、可被長期維護的資料 |
| `t_` | Transaction / 交易資料 | 行為紀錄、交易紀錄、流程資料 |

## 4. 模組名稱

Postoria 相關表格統一使用：

```text
postoria
```

命名格式：

```text
b_postoria_xxx
t_postoria_xxx
```

未來若其他網站併入 ERP DB，也應使用各自模組名稱，例如：

```text
b_shop_member
t_shop_order
b_forum_post
t_forum_comment
```

## 5. 主鍵命名

每張資料表使用 UUID 作為主鍵。

主鍵欄位命名格式：

```text
{entity_name}_uid
```

目前範例：

| 表格 | 主鍵欄位 |
|---|---|
| `b_postoria_member` | `postoria_member_uid` |
| `b_postoria_postcard` | `postcard_uid` |
| `t_postoria_member_favorite` | `member_favorite_uid` |
| `t_postoria_postcard_upload` | `postcard_upload_uid` |

## 6. 關聯鍵命名

關聯其他資料表時，使用對方主鍵欄位名稱。

例如：

```text
company_uid
postoria_member_uid
postcard_uid
published_postcard_uid
```

## 7. 多公司資料隔離

所有 Postoria 相關表格都需要有：

```text
company_uid
```

用途：

- 區隔不同公司或網站資料
- 後台查詢時避免看到其他公司資料
- 方便未來 ERP DB 合併多網站資料

Postoria 固定使用自己的 `company_uid`。

## 8. 標準欄位

每張表格至少應具備：

```text
created_at
created_by
updated_at
updated_by
is_deleted
```

建議完整標準欄位：

| 欄位 | 型別建議 | 說明 |
|---|---|---|
| `created_at` | `timestamp(0) without time zone` | 資料建立時間 |
| `created_by` | `uuid` | 建立者 UUID |
| `updated_at` | `timestamp(0) without time zone` | 最後更新時間 |
| `updated_by` | `uuid` | 最後更新者 UUID |
| `is_deleted` | `boolean` | 是否邏輯刪除 |
| `deleted_at` | `timestamp(0) without time zone` | 邏輯刪除時間 |
| `deleted_by` | `uuid` | 刪除者 UUID |
| `remark` | `text` | 備註 |

## 9. 時間欄位規則

時間欄位命名：

```text
xxx_at
```

例如：

```text
created_at
updated_at
deleted_at
locked_at
last_login_at
reviewed_at
reset_password_token_expires_at
```

日期欄位命名：

```text
xxx_date
```

例如：

```text
password_date
```

## 10. 布林欄位規則

布林欄位使用清楚的是/否語意：

```text
is_xxx
has_xxx
xxx_verified
```

目前範例：

```text
is_deleted
is_locked
is_published
email_verified
phone_verified
is_password_reset_required
```

## 11. 文字與代碼欄位

常見命名：

| 欄位後綴 | 用途 |
|---|---|
| `_code` | 代碼 |
| `_name` | 名稱 |
| `_type` | 類型 |
| `_status` | 狀態 |
| `_note` | 備註或說明 |
| `_url` | URL |
| `_path` | 檔案或資源路徑 |
| `_hash` | hash 後的資料 |

目前範例：

```text
member_code
display_name
postcard_type
review_status
review_note
avatar_url
image_path
password_hash
reset_password_token_hash
```

## 12. Index 命名

一般 index 命名格式：

```text
idx_{table_name}_{purpose}
```

例如：

```text
idx_b_postoria_member_company
idx_b_postoria_member_company_deleted
idx_b_postoria_postcard_location
idx_b_postoria_postcard_home
idx_t_postoria_member_favorite_member
idx_t_postoria_postcard_upload_review
```

## 13. Unique Index 命名

唯一索引命名格式：

```text
uq_{table_name}_{purpose}
```

例如：

```text
uq_b_postoria_member_email
uq_b_postoria_postcard_legacy
uq_t_postoria_member_favorite
```

## 14. Primary Key 命名

主鍵 constraint 命名格式：

```text
pk_{table_name}
```

例如：

```text
pk_b_postoria_member
pk_b_postoria_postcard
pk_t_postoria_member_favorite
pk_t_postoria_postcard_upload
```

## 15. Postoria 目前資料表

| 表格 | 類型 | 說明 |
|---|---|---|
| `b_postoria_member` | 基本資料 | Postoria 前台會員 |
| `b_postoria_postcard` | 基本資料 | Postoria 明信片主資料 |
| `t_postoria_member_favorite` | 交易資料 | 會員收藏明信片 |
| `t_postoria_postcard_upload` | 交易資料 | 會員上傳待審核明信片 |

## 16. Postoria 欄位範例

### 16.1 `b_postoria_member`

```text
postoria_member_uid
company_uid
member_code
email
normalized_email
password_hash
display_name
phone
avatar_url
email_verified
phone_verified
is_locked
locked_at
last_login_at
password_date
is_password_reset_required
reset_password_token_hash
reset_password_token_expires_at
created_at
created_by
updated_at
updated_by
is_deleted
deleted_at
remark
```

### 16.2 `b_postoria_postcard`

```text
postcard_uid
company_uid
legacy_id
legacy_number
title
country
city
latitude
longitude
image_path
tags
postcard_type
like_count
view_count
is_published
created_at
created_by
updated_at
updated_by
is_deleted
deleted_at
remark
```

### 16.3 `t_postoria_member_favorite`

```text
member_favorite_uid
company_uid
postoria_member_uid
postcard_uid
created_at
created_by
updated_at
updated_by
is_deleted
deleted_at
deleted_by
```

### 16.4 `t_postoria_postcard_upload`

```text
postcard_upload_uid
company_uid
postoria_member_uid
title
country
city
latitude
longitude
image_path
original_file_name
content_type
file_size
tags
postcard_type
review_status
reviewed_by
reviewed_at
review_note
published_postcard_uid
created_at
created_by
updated_at
updated_by
is_deleted
deleted_at
deleted_by
remark
```

## 17. 中文註解規則

PostgreSQL table 與 column 建議加中文註解。

語法範例：

```sql
COMMENT ON TABLE public.b_postoria_member IS 'Postoria 會員基本資料表，存放網站前台會員帳號、登入與驗證狀態。';

COMMENT ON COLUMN public.b_postoria_member.email IS '會員電子郵件，作為登入帳號使用。';
```

目前 Postoria 相關表格與欄位已加中文 COMMENT。

## 18. 新增表格檢查清單

新增 Postoria 或其他網站資料表時，請確認：

- [ ] 表格名稱符合 `{b|t}_{module}_{entity}`。
- [ ] 使用 UUID 作為 PK。
- [ ] PK 命名為 `{entity}_uid`。
- [ ] 有 `company_uid`。
- [ ] 有 `created_at`。
- [ ] 有 `created_by`。
- [ ] 有 `updated_at`。
- [ ] 有 `updated_by`。
- [ ] 有 `is_deleted`。
- [ ] 視需求加入 `deleted_at`、`deleted_by`、`remark`。
- [ ] 建立必要 index。
- [ ] index 命名符合 `idx_` / `uq_` / `pk_` 規則。
- [ ] table 與 column 加中文 COMMENT。

## 19. 簡短總結

```text
b_ = 基本資料表
t_ = 交易資料表
*_uid = UUID 主鍵或關聯鍵
company_uid = 公司資料隔離
created_at / updated_at = 時間
created_by / updated_by = 人員 UUID
is_deleted = 邏輯刪除
pk_ = primary key
idx_ = normal index
uq_ = unique index
```

