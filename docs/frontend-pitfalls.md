# 前端开发坑点记录

## 坑点 #17: Next.js 16 Link 组件导入方式错误

**错误表现：**

```
Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined.
```

**问题原因：**
在 Next.js 16 中，`Link` 组件必须使用**默认导入**，不能使用具名导入。

**错误代码：**

```typescript
import { Link } from "next/link"; // ❌ 错误：具名导入
```

**正确代码：**

```typescript
import Link from "next/link"; // ✅ 正确：默认导入
```

**影响文件：**

- `apps/web/app/all-components/page.tsx`
- `apps/web/app/(auth)/login/page.tsx`

**解决方法：**
将所有 `import { Link } from 'next/link'` 改为 `import Link from 'next/link'`

**为什么会发生这个问题：**
在 Next.js 16 中，`next/link` 模块的导出方式发生了变化。`Link` 组件现在是默认导出，而不是具名导出。使用具名导入会导致 `Link` 为 `undefined`，从而引发 React 的 "Element type is invalid" 错误。

**验证方法：**

```bash
# 访问测试页面
http://localhost:3000/all-components
http://localhost:3000/login
```

页面应该正常显示，所有组件包括 Link 组件都应该正常工作。
