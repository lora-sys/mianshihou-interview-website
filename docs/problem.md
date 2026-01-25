  你遇到了 Git 子仓库未加入主仓库远程 的问题。

  问题表现
   - mianshihou/ 目录是一个独立的 Git 仓库（有自己的 .git/ 目录）
   - 但它没有被配置为 Git 子模块（没有 .gitmodules 文件）
   - 主仓库的远程仓库中不包含这个子仓库

  解决方案
  采用了将子仓库整合为普通目录的方式：

   1. 删除子仓库的 Git 历史：rm -rf mianshihou/.git
   2. 从主仓库索引中移除子模块引用：git rm --cached mianshihou
   3. 将目录作为普通文件添加：git add mianshihou/

  结果
   - mianshihou/ 不再是独立的 Git 仓库
   - 所有文件现在都是主仓库的一部分
   - 提交后，这些文件会被推送到远程仓库
     git@github.com:lora-sys/mianshihou-interview-website.git
