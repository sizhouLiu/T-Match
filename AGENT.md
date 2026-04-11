# 紧凑代码风格规范 (Python)

本项目采用紧凑代码风格（Compact Code Style），强调代码的简洁性、高密度表达和自描述能力。核心目标是减少视觉噪音，使逻辑一目了然。

## 核心原则

**代码即文档** - 依靠类型提示（Type Hints）、精确命名和扁平结构表达意图，去除冗余注释。

## 10 条核心规则

### 1. 无多余注释
删除所有 `"""docstring"""`（非公共 API）和 `#` 行注释。逻辑应通过代码本身表达。

**❌ 错误：**
```python
# 检查用户是否有效
if user and user.is_active:
    # 返回权限列表
    return user.permissions
```

**✅ 正确：**
```python
if user and user.is_active: return user.permissions
```

### 2. 早返回 (Early Return)
条件满足立即 return，减少 `if-else` 嵌套层级。

**❌ 错误：**
```python
def process_data(data):
    if data:
        res = transform(data)
        if res:
            return save(res)
    return None
```

**✅ 正确：**
```python
def process_data(data: dict) -> bool | None:
    if not data: return None
    if not (res := transform(data)): return None
    return save(res)
```

### 3. 单行条件句
简单的条件判断与执行语句写在同一行。

**❌ 错误：**
```python
if error:
    raise RuntimeError(error)

if not item:
    return default
```

**✅ 正确：**
```python
if error: raise RuntimeError(error)
if not item: return default
```

### 4. 字典/对象安全取值
使用 `.get()`、`getattr()` 或 `or` 简化取值逻辑，避免冗长的键值存在性检查。

**❌ 错误：**
```python
value = None
if "config" in settings:
    if "timeout" in settings["config"]:
        value = settings["config"]["timeout"]
```

**✅ 正确：**
```python
value = settings.get("config", {}).get("timeout")
```

### 5. 内联数据结构
简单字典或列表直接返回，不创建中间变量。

**❌ 错误：**
```python
payload = {
    "user_id": user.id,
    "status": "active",
    "timestamp": time.time()
}
return payload
```

**✅ 正确：**
```python
return {"user_id": user.id, "status": "active", "timestamp": time.time()}
```

### 6. 巧妙使用海象运算符 (:=)
在需要赋值并进行条件判断的场景，使用海象运算符减少行数。

**❌ 错误：**
```python
match = re.search(pattern, text)
if match:
    group = match.group(1)
    return do_something(group)
```

**✅ 正确：**
```python
if match := re.search(pattern, text):
    return do_something(match.group(1))
```

### 7. 推导式优于循环
优先使用列表推导式、字典推导式替代简单的 `for` 循环。

**❌ 错误：**
```python
active_names = []
for u in users:
    if u.active:
        active_names.append(u.name)
```

**✅ 正确：**
```python
active_names = [u.name for u in users if u.active]
```

### 8. 压缩空行
逻辑块之间不留多余空行。函数内部代码应保持紧凑。

**❌ 错误：**
```python
def update_user(uid, data):
    user = db.get(uid)

    if not user:
        return False

    user.update(data)
    return True
```

**✅ 正确：**
```python
def update_user(uid: str, data: dict) -> bool:
    if not (user := db.get(uid)): return False
    user.update(data)
    return True
```

### 9. 严禁使用 print
生产代码不留调试日志，必须使用 `logging` 或项目封装的 `logger`。

**❌ 错误：**
```python
print(f"Task started: {task_id}")
```

**✅ 正确：**
```python
logger.info("task_started", extra={"task_id": task_id})
```

### 10. 三元运算符优于 if-else
简单的条件赋值使用 Python 的单行三元表达式。

**❌ 错误：**
```python
if score > 60:
    result = "pass"
else:
    result = "fail"
```

**✅ 正确：**
```python
result = "pass" if score > 60 else "fail"
```

---

## 完整示例对比

### ❌ 冗长风格
```python
def get_quota_status(user_id):
    # 查找用户
    user = user_service.get_user(user_id)
    
    if user:
        # 检查是否是 VIP
        if user.is_vip:
            return "unlimited"
        else:
            # 检查余额
            if user.balance > 0:
                return "available"
            else:
                return "empty"
    else:
        return "not_found"
```

### ✅ 紧凑风格
```python
def get_quota_status(user_id: str) -> str:
    if not (user := user_service.get_user(user_id)): return "not_found"
    if user.is_vip: return "unlimited"
    return "available" if user.balance > 0 else "empty"
```

## 例外情况
1. **复杂算法**：涉及多步数学运算或复杂公式时，允许使用空行和少量注释。
2. **Pydantic 模型**：`Field` 的 `description` 应保留，以支持自动文档生成。
3. **法律/协议**：涉及版权声明或必须的法律注释时保留。

## 总结
紧凑代码风格的核心是 **删除冗余，保留本质**。好的 Python 代码应当像优美的数学公式一样简洁有力。