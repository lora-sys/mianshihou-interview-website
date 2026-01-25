-- 测试数据
CREATE EXTENSION IF NOT EXISTS vector;

-- 插入用户数据
INSERT INTO "user" (user_account, user_password, user_name, user_avatar, user_profile, user_role, status) VALUES
('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '管理员', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', '我是管理员', 'admin', 'active'),
('user1', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '张三', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1', '前端开发者', 'user', 'active'),
('user2', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '李四', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2', '后端开发者', 'user', 'active'),
('user3', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '王五', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3', '全栈工程师', 'user', 'active'),
('user4', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '赵六', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4', '算法工程师', 'user', 'active'),
('user5', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '前端小王', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5', 'Vue3爱好者', 'user', 'active'),
('user6', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '测试小明', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user6', '测试工程师', 'user', 'active'),
('user7', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '产品小李', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user7', '产品经理', 'user', 'active'),
('user8', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '设计小张', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user8', 'UI设计师', 'user', 'active'),
('user9', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '运维小刘', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user9', 'DevOps工程师', 'user', 'active'),
('user10', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKKlNLkzSx5m0xGH7rQEJAiS1Qa', '数据分析师', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user10', '数据分析师', 'user', 'active');

-- 插入题库数据
INSERT INTO question_bank (title, description, picture, user_id, question_count) VALUES
('前端面试题库', '包含HTML、CSS、JavaScript、Vue、React等前端面试题', 'https://picsum.photos/seed/bank1/400/300', 2, 15),
('后端面试题库', '包含Java、Go、Python、Node.js等后端面试题', 'https://picsum.photos/seed/bank2/400/300', 3, 20),
('算法题库', '经典算法题和数据结构题目', 'https://picsum.photos/seed/bank3/400/300', 4, 30),
('系统设计题库', '分布式系统、高并发、系统架构设计题', 'https://picsum.photos/seed/bank4/400/300', 3, 10),
('数据库面试题库', 'MySQL、PostgreSQL、MongoDB等数据库面试题', 'https://picsum.photos/seed/bank5/400/300', 4, 12),
('React面试题库', 'React核心概念、Hooks、状态管理面试题', 'https://picsum.photos/seed/bank6/400/300', 5, 18),
('Vue面试题库', 'Vue2/Vue3、Composition API、Pinia面试题', 'https://picsum.photos/seed/bank7/400/300', 5, 16),
('TypeScript面试题', 'TypeScript类型系统、泛型、工具类型面试题', 'https://picsum.photos/seed/bank8/400/300', 2, 14),
('Node.js面试题', 'Node.js核心模块、Express/NestJS框架面试题', 'https://picsum.photos/seed/bank9/400/300', 3, 11),
('微服务面试题', '微服务架构、Docker、Kubernetes面试题', 'https://picsum.photos/seed/bank10/400/300', 3, 8);

-- 插入题目数据
INSERT INTO question (title, content, tags, answer, user_id, question_bank_id) VALUES
('什么是闭包？闭包有什么作用？', '请解释JavaScript中闭包的概念及其实际应用场景。', '["JavaScript", "闭包", "作用域"]', '闭包是指一个函数可以访问其外部函数作用域中的变量，即使外部函数已经执行完毕。闭包的作用：1. 可以读取函数内部的变量；2. 让变量的值始终保持在内存中；3. 实现模块化编程。', 2, 1),
('解释一下JavaScript的事件循环机制', '请详细解释Event Loop的工作原理。', '["JavaScript", "事件循环", "宏任务", "微任务"]', '事件循环是JavaScript单线程执行模型的核心机制。它会不断检查调用栈是否为空，如果为空则从任务队列中取出第一个任务执行。任务分为宏任务和微任务。', 2, 1),
('React中useState和useReducer的区别？', '什么情况下应该使用useReducer而不是useState？', '["React", "Hooks"]', 'useState适合简单的状态管理，useReducer适合复杂的状态逻辑。', 5, 6),
('Vue3中Composition API相比Options API有什么优势？', '请对比分析Vue3的两种API风格。', '["Vue", "Composition API"]', 'Composition API的优势：更好的逻辑复用、更好的类型推断、更灵活的代码拆分。', 5, 7),
('什么是虚拟DOM？有什么优缺点？', '解释虚拟DOM的概念以及在框架中的应用。', '["虚拟DOM", "React", "Vue"]', '虚拟DOM是真实DOM的JavaScript对象映射。通过Diff算法比较差异，最小化DOM操作。', 2, 1),
('如何实现一个防抖函数？', '请写出防抖函数的实现代码。', '["JavaScript", "防抖"]', '防抖函数：当触发事件后，在指定时间内没有再次触发时才执行回调。', 4, 3),
('解释一下React的渲染流程', '从组件更新到最终渲染到DOM的完整过程是怎样的？', '["React", "渲染"]', '1. 触发状态更新；2. 创建新的虚拟DOM；3. Diff算法对比；4. 计算最小更新操作；5. 应用更新到真实DOM。', 5, 6),
('HTTP和HTTPS的区别是什么？', 'HTTPS相对于HTTP有哪些改进？', '["HTTP", "HTTPS"]', 'HTTP是明文传输，HTTPS增加TLS/SSL加密层，更安全，能防止中间人攻击。', 3, 2),
('什么是B+树？有什么应用场景？', '解释B+树的结构特点和实际应用。', '["数据结构", "B+树", "数据库"]', 'B+树是自平衡的多路搜索树，所有数据存储在叶子节点，非叶子节点仅存储索引。', 4, 3),
('解释一下RESTful API的设计原则', '如何设计一个规范的RESTful API？', '["RESTful", "API设计"]', '使用HTTP动词、资源使用名词复数形式、层次化URI、合适的状态码。', 3, 2),
('Vue中computed和watch的区别？', '什么情况下使用computed，什么情况下使用watch？', '["Vue", "computed", "watch"]', 'computed用于计算属性，watch用于观察数据变化并执行副作用。', 5, 7),
('解释一下数据库事务的ACID特性', '事务的ACID分别代表什么？', '["数据库", "事务", "ACID"]', 'Atomicity原子性、Consistency一致性、Isolation隔离性、Durability持久性。', 4, 5),
('React中如何实现组件通信？', '列举React中不同场景下的组件通信方式。', '["React", "组件通信"]', '父子组件用Props、兄弟组件提升状态、跨层级用Context、任意组件用状态管理工具。', 5, 6),
('TypeScript中interface和type的区别', '什么情况下用interface，什么情况下用type？', '["TypeScript", "interface", "type"]', 'interface可以声明合并，type可以定义联合类型。对象类型用interface，复杂类型用type。', 2, 8),
('解释一下什么是依赖注入', '依赖注入的原理和优势是什么？', '["设计模式", "依赖注入"]', '依赖注入将对象的依赖从内部创建改为外部注入，降低耦合度、提高可测试性。', 3, 4),
('什么是CDN？有什么作用？', '解释CDN的工作原理和优势。', '["CDN", "性能"]', 'CDN通过全球边缘节点缓存静态资源，减少延迟、减轻源站压力。', 2, 1),
('如何优化Web应用的性能？', '从前端角度列举常见的性能优化手段。', '["性能优化", "前端"]', '代码层面优化、资源优化、构建优化、网络优化。', 2, 1),
('解释一下Docker的基本概念', 'Docker中镜像、容器、仓库是什么关系？', '["Docker", "容器"]', '镜像是只读模板，容器是镜像运行实例，仓库是存储分发镜像的地方。', 9, 10),
('什么是Kubernetes？有什么核心概念？', 'K8s的主要组件和核心概念介绍。', '["Kubernetes"]', '核心概念：Pod、Service、Deployment、ConfigMap、PersistentVolume、Namespace。', 9, 10),
('Node.js中EventEmitter是什么？', '解释Node.js事件驱动编程模式。', '["Node.js", "EventEmitter"]', 'EventEmitter是Node.js事件模块的核心类，通过on()监听事件、emit()触发事件。', 3, 9);

-- 插入题库题目关联
INSERT INTO question_bank_question (question_bank_id, question_id, user_id) VALUES
(1, 1, 2), (1, 2, 2), (1, 5, 2), (1, 9, 2), (1, 16, 2), (1, 17, 2),
(2, 8, 3), (2, 12, 3), (2, 15, 3),
(3, 6, 4), (3, 9, 4), (3, 13, 4),
(4, 15, 3), (4, 18, 9),
(5, 12, 4),
(6, 3, 5), (6, 7, 5), (6, 13, 5),
(7, 4, 5), (7, 11, 5),
(8, 14, 2),
(9, 19, 3),
(10, 18, 9), (10, 19, 9);

-- 插入帖子数据
INSERT INTO post (title, content, tags, thumb_num, favour_num, user_id) VALUES
('分享一个超实用的React Hooks库', '今天发现了一个很棒的React Hooks库。', '["React", "Hooks"]', 156, 23, 2),
('Vue3项目性能优化经验总结', '分享Vue3项目的性能优化技巧。', '["Vue", "性能优化"]', 234, 45, 5),
('TypeScript高级类型技巧', '分享TypeScript中不常用但很实用的类型技巧。', '["TypeScript"]', 189, 34, 2),
('前端面试系列文章之一：JS基础', 'JavaScript基础面试题汇总。', '["JavaScript", "面试"]', 567, 89, 3),
('React Concurrent Mode初体验', 'React 18的Concurrent Mode新特性体验。', '["React"]', 145, 21, 5),
('如何在Vue中实现动态权限管理', '基于RBAC的Vue前端权限管理方案。', '["Vue", "权限管理"]', 198, 32, 5),
('Node.js项目Docker化部署实践', '从零开始将Node.js项目容器化。', '["Node.js", "Docker"]', 267, 48, 9),
('前端工程化之ESLint配置详解', '手把手教你配置ESLint。', '["ESLint", "工程化"]', 134, 19, 2),
('GraphQL与RESTful API对比实践', 'GraphQL和RESTful API的实践经验。', '["GraphQL", "RESTful"]', 178, 28, 3),
('Web性能监控最佳实践', '搭建前端性能监控系统。', '["性能监控"]', 312, 56, 4),
('小程序开发避坑指南', '微信小程序开发中的坑和解决方案。', '["小程序", "微信"]', 423, 67, 7),
('CSS Grid布局完全指南', 'CSS Grid布局系统详解。', '["CSS", "Grid"]', 289, 45, 8),
('微服务架构下的前端改造之路', '从单体应用到微服务的改造经验。', '["微服务", "架构"]', 156, 23, 3),
('Vite与Webpack构建速度对比', 'Vite和Webpack构建速度对比测试。', '["Vite", "Webpack"]', 445, 78, 2),
('前端代码质量提升之道', '如何提升前端代码质量。', '["代码质量", "测试"]', 198, 34, 6),
('WebSocket实时通信实践', 'WebSocket实现实时聊天功能。', '["WebSocket", "Node.js"]', 367, 56, 3),
('前端埋点SDK开发经验', '开发一个轻量级的前端埋点SDK。', '["埋点", "数据分析"]', 234, 38, 4),
('React状态管理方案对比', '四种状态管理方案横向对比。', '["React", "Redux"]', 567, 89, 5),
('前端面试之数据库知识', '前端也需要了解的数据库知识。', '["数据库", "SQL"]', 312, 52, 4),
('PWA应用开发完全指南', '将Web应用改造为PWA。', '["PWA"]', 278, 43, 2);

-- 插入帖子点赞数据
INSERT INTO post_thumb (post_id, user_id) VALUES
(1, 3), (1, 4), (1, 5), (1, 6), (1, 7),
(2, 2), (2, 3), (2, 4), (2, 6), (2, 8),
(3, 1), (3, 2), (3, 5), (3, 7),
(4, 2), (4, 3), (4, 5), (4, 6), (4, 7), (4, 8), (4, 9), (4, 10),
(5, 2), (5, 3), (5, 4),
(6, 2), (6, 3), (6, 7), (6, 8),
(7, 2), (7, 3), (7, 4), (7, 5), (7, 6), (7, 9),
(8, 3), (8, 5), (8, 6),
(9, 2), (9, 4), (9, 7),
(10, 2), (10, 3), (10, 5), (10, 6), (10, 8), (10, 9),
(11, 3), (11, 4), (11, 5), (11, 6), (11, 7), (11, 8),
(12, 2), (12, 5), (12, 7), (12, 8),
(13, 3), (13, 4), (13, 6),
(14, 2), (14, 3), (14, 5), (14, 7), (14, 8), (14, 9), (14, 10),
(15, 4), (15, 6), (15, 8),
(16, 2), (16, 3), (16, 5), (16, 7), (16, 9),
(17, 3), (17, 4), (17, 5), (17, 8), (17, 10),
(18, 2), (18, 3), (18, 4), (18, 6), (18, 7), (18, 8), (18, 9),
(19, 5), (19, 6), (19, 7), (19, 9),
(20, 2), (20, 3), (20, 4), (20, 6), (20, 8);

-- 插入帖子收藏数据
INSERT INTO post_favour (post_id, user_id) VALUES
(4, 2), (4, 5), (4, 7),
(7, 3), (7, 9),
(10, 4), (10, 6),
(14, 2), (14, 8),
(18, 5), (18, 7),
(20, 3),
(1, 5), (3, 6), (5, 2), (6, 4), (8, 3), (9, 5), (11, 8), (12, 2), (13, 7), (15, 4),
(16, 6), (17, 9), (19, 2);

-- 更新题库题目数量统计
UPDATE question_bank SET question_count = (SELECT COUNT(*) FROM question_bank_question WHERE question_bank_question.question_bank_id = question_bank.id);
