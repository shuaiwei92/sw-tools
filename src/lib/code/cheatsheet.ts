// 快捷键速查表数据与搜索，纯函数。

export interface Shortcut {
  keys: string;
  desc: string;
}

export interface CheatGroup {
  id: string;
  name: string;
  items: Shortcut[];
}

export interface SearchResultGroup {
  id: string;
  name: string;
  items: Shortcut[];
}

export const CHEAT_GROUPS: CheatGroup[] = [
  {
    id: 'git',
    name: 'Git',
    items: [
      { keys: 'git init', desc: '初始化新仓库' },
      { keys: 'git clone <url>', desc: '克隆远程仓库' },
      { keys: 'git status', desc: '查看工作区状态' },
      { keys: 'git add <file>', desc: '暂存文件（git add . 暂存全部）' },
      { keys: 'git commit -m "msg"', desc: '提交暂存区改动' },
      { keys: 'git commit --amend', desc: '修改最近一次提交（信息或内容）' },
      { keys: 'git push', desc: '推送本地提交到远程' },
      { keys: 'git pull', desc: '拉取远程更新并合并' },
      { keys: 'git fetch', desc: '仅拉取远程更新，不合并' },
      { keys: 'git branch', desc: '查看本地分支列表' },
      { keys: 'git checkout -b <name>', desc: '创建并切换到新分支' },
      { keys: 'git switch <name>', desc: '切换分支（新语法）' },
      { keys: 'git merge <branch>', desc: '合并指定分支到当前分支' },
      { keys: 'git rebase <branch>', desc: '将当前提交变基到目标分支' },
      { keys: 'git log --oneline --graph', desc: '图形化查看提交历史' },
      { keys: 'git diff', desc: '查看未暂存的改动' },
      { keys: 'git diff --staged', desc: '查看已暂存的改动' },
      { keys: 'git stash', desc: '暂存当前未提交的改动' },
      { keys: 'git stash pop', desc: '恢复并删除最近的暂存' },
      { keys: 'git reset --hard HEAD', desc: '重置到 HEAD，丢弃所有改动（慎用）' },
      { keys: 'git reset --soft HEAD~1', desc: '撤销最近一次提交，保留改动' },
      { keys: 'git remote -v', desc: '查看远程仓库地址' },
      { keys: 'git tag <name>', desc: '给当前提交打标签' },
      { keys: 'git cherry-pick <commit>', desc: '拣选指定提交到当前分支' },
      { keys: 'git revert <commit>', desc: '生成一次反向提交来撤销' },
    ],
  },
  {
    id: 'vim',
    name: 'Vim',
    items: [
      { keys: 'i', desc: '进入插入模式' },
      { keys: 'Esc', desc: '返回普通模式' },
      { keys: ':w', desc: '保存文件' },
      { keys: ':q', desc: '退出' },
      { keys: ':wq', desc: '保存并退出' },
      { keys: ':q!', desc: '强制退出，不保存' },
      { keys: 'dd', desc: '删除（剪切）当前行' },
      { keys: 'yy', desc: '复制当前行' },
      { keys: 'p', desc: '粘贴到光标之后' },
      { keys: 'u', desc: '撤销' },
      { keys: 'Ctrl+R', desc: '重做（撤销的撤销）' },
      { keys: 'o / O', desc: '在下方 / 上方开新行并进入插入' },
      { keys: '/关键词', desc: '向下搜索' },
      { keys: 'n / N', desc: '下一个 / 上一个匹配项' },
      { keys: ':%s/old/new/g', desc: '全文替换' },
      { keys: 'gg / G', desc: '跳到文件开头 / 结尾' },
      { keys: 'dw', desc: '删除一个单词' },
      { keys: 'ci"', desc: '修改引号内内容（ci 可配任意定界符）' },
      { keys: 'v / V', desc: '进入可视 / 行可视模式' },
      { keys: 'Ctrl+V', desc: '块可视模式（列编辑）' },
    ],
  },
  {
    id: 'linux',
    name: 'Linux / Shell',
    items: [
      { keys: 'ls -la', desc: '列出全部文件（含隐藏）' },
      { keys: 'cd <dir>', desc: '切换目录' },
      { keys: 'pwd', desc: '显示当前所在目录' },
      { keys: 'cp -r src dst', desc: '递归复制目录' },
      { keys: 'mv src dst', desc: '移动文件或重命名' },
      { keys: 'rm -rf <dir>', desc: '强制递归删除（慎用）' },
      { keys: 'mkdir -p a/b', desc: '递归创建多级目录' },
      { keys: 'touch file', desc: '创建空文件或更新时间戳' },
      { keys: 'cat file', desc: '输出文件全部内容' },
      { keys: 'less file', desc: '分页查看文件（q 退出）' },
      { keys: 'head -n 20 file', desc: '查看文件前 20 行' },
      { keys: 'tail -f file', desc: '实时跟踪文件新增内容' },
      { keys: 'grep -rn "词" dir', desc: '在目录中递归搜索内容' },
      { keys: 'find . -name "*.log"', desc: '按文件名查找' },
      { keys: 'chmod +x script', desc: '添加可执行权限' },
      { keys: 'chown user:group file', desc: '修改文件属主与属组' },
      { keys: 'ps aux', desc: '查看所有进程' },
      { keys: 'kill -9 <pid>', desc: '强制结束指定进程' },
      { keys: 'top / htop', desc: '进程资源监控' },
      { keys: 'df -h', desc: '查看磁盘使用情况' },
      { keys: 'du -sh dir', desc: '统计目录总大小' },
      { keys: 'tar -czf a.tgz dir', desc: '打包并用 gzip 压缩' },
      { keys: 'tar -xzf a.tgz', desc: '解压 tar.gz 包' },
      { keys: 'ssh user@host', desc: '远程登录主机' },
      { keys: 'scp file user@host:/path', desc: '与远程主机互传文件' },
      { keys: 'rsync -avz src dst', desc: '增量同步目录' },
      { keys: 'systemctl status svc', desc: '查看系统服务状态' },
      { keys: 'sudo <cmd>', desc: '以 root 权限执行命令' },
      { keys: 'man <cmd>', desc: '查看命令手册' },
      { keys: 'ln -s target link', desc: '创建软链接' },
      { keys: 'wc -l file', desc: '统计文件行数' },
    ],
  },
  {
    id: 'windows',
    name: 'Windows',
    items: [
      { keys: 'Win+D', desc: '显示 / 隐藏桌面' },
      { keys: 'Win+E', desc: '打开资源管理器' },
      { keys: 'Win+L', desc: '锁定屏幕' },
      { keys: 'Win+R', desc: '打开「运行」对话框' },
      { keys: 'Win+V', desc: '打开剪贴板历史' },
      { keys: 'Win+.', desc: '打开 emoji 与符号面板' },
      { keys: 'Win+Shift+S', desc: '区域截图并写入剪贴板' },
      { keys: 'Win+Tab', desc: '打开任务视图' },
      { keys: 'Alt+Tab', desc: '在窗口间切换' },
      { keys: 'Alt+F4', desc: '关闭当前窗口' },
      { keys: 'Ctrl+Shift+Esc', desc: '直接打开任务管理器' },
      { keys: 'Win+X', desc: '打开高级用户菜单' },
      { keys: 'Ctrl+C / Ctrl+V', desc: '复制 / 粘贴' },
      { keys: 'Ctrl+X', desc: '剪切' },
      { keys: 'Ctrl+Z', desc: '撤销' },
      { keys: 'Win+← / Win+→', desc: '窗口左右半屏分屏' },
      { keys: 'Win+Shift+←/→', desc: '窗口移动到另一台显示器' },
      { keys: 'F2', desc: '重命名选中文件' },
      { keys: 'Shift+Delete', desc: '永久删除（不进回收站）' },
      { keys: 'Win+I', desc: '打开系统设置' },
    ],
  },
  {
    id: 'vscode',
    name: 'VS Code',
    items: [
      { keys: 'Ctrl+P', desc: '快速打开文件' },
      { keys: 'Ctrl+Shift+P', desc: '打开命令面板' },
      { keys: 'Ctrl+B', desc: '显示 / 隐藏侧边栏' },
      { keys: 'Ctrl+`', desc: '显示 / 隐藏集成终端' },
      { keys: 'Ctrl+/', desc: '注释 / 取消注释当前行' },
      { keys: 'Shift+Alt+A', desc: '块注释' },
      { keys: 'Alt+↑ / Alt+↓', desc: '上下移动当前行' },
      { keys: 'Shift+Alt+↓', desc: '向下复制当前行' },
      { keys: 'Ctrl+D', desc: '选中下一个相同词（多光标）' },
      { keys: 'Ctrl+Shift+L', desc: '选中全部相同词' },
      { keys: 'F2', desc: '重命名符号（全项目生效）' },
      { keys: 'Ctrl+.', desc: '快速修复 / 代码操作' },
      { keys: 'F12', desc: '跳到定义' },
      { keys: 'Shift+F12', desc: '查看所有引用' },
      { keys: 'Ctrl+Shift+F', desc: '全局搜索' },
      { keys: 'Ctrl+Shift+O', desc: '按符号在当前文件跳转' },
      { keys: 'Alt+Z', desc: '切换自动换行' },
      { keys: 'Ctrl+Shift+K', desc: '删除当前行' },
      { keys: 'Ctrl+G', desc: '跳到指定行号' },
      { keys: 'Ctrl+Home / Ctrl+End', desc: '跳到文件开头 / 结尾' },
      { keys: 'Ctrl+\\', desc: '拆分编辑器' },
      { keys: 'Ctrl+W', desc: '关闭当前编辑器标签' },
    ],
  },
  {
    id: 'excel',
    name: 'Excel',
    items: [
      { keys: 'Ctrl+;', desc: '插入当前日期' },
      { keys: 'Ctrl+Shift+;', desc: '插入当前时间' },
      { keys: 'F4', desc: '在相对 / 绝对引用间切换' },
      { keys: 'Ctrl+Shift+L', desc: '开启 / 关闭筛选' },
      { keys: 'Alt+=', desc: '自动求和' },
      { keys: 'Ctrl+Enter', desc: '向选中区域批量填充相同内容' },
      { keys: 'F2', desc: '编辑当前单元格' },
      { keys: 'Ctrl+[', desc: '追踪引用单元格' },
      { keys: 'Shift+F11', desc: '新建工作表' },
      { keys: 'Ctrl+PageDown / PageUp', desc: '切换到下一张 / 上一张工作表' },
      { keys: 'Ctrl+Shift+↑/↓', desc: '选中到数据边界' },
      { keys: 'Alt+Enter', desc: '单元格内换行' },
    ],
  },
];

/** 搜索快捷键：keys / 描述模糊匹配（大小写不敏感），keys 命中排在描述命中前；空查询返回全部。 */
export function searchShortcuts(query: string, groups: CheatGroup[] = CHEAT_GROUPS): SearchResultGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups.map((g) => ({ id: g.id, name: g.name, items: [...g.items] }));
  const out: SearchResultGroup[] = [];
  for (const g of groups) {
    if (g.name.toLowerCase().includes(q)) {
      out.push({ id: g.id, name: g.name, items: [...g.items] });
      continue;
    }
    const keyHits: Shortcut[] = [];
    const descHits: Shortcut[] = [];
    for (const item of g.items) {
      if (item.keys.toLowerCase().includes(q)) keyHits.push(item);
      else if (item.desc.toLowerCase().includes(q)) descHits.push(item);
    }
    if (keyHits.length || descHits.length) {
      out.push({ id: g.id, name: g.name, items: [...keyHits, ...descHits] });
    }
  }
  return out;
}

/** 快捷键总条数。 */
export function countShortcuts(groups: CheatGroup[] = CHEAT_GROUPS): number {
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}
