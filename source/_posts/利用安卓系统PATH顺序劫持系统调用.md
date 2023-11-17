---
title: 利用安卓系统 PATH 顺序劫持系统调用
date: 2021-10-04 11:19:00
categories: 逆向
tags: [逆向, 安卓]
url: /2021/10/04/利用安卓系统PATH顺序劫持系统调用/
---

起因是最近在分析安卓平台的一个小玩意儿，需要过它的网络验证。这个 app 要了 root 权限和 xposed 模块才能正常运行，验证则是使用了 http://1.1.1.1 的形式，很容易想到用 iptables 劫持。

```bash
iptables -t nat -A OUTPUT -d 119.188.245.15 -j DNAT --to-destination 192.168.31.106
```
没想到这次这个 app 也学聪明了，在关键功能的地方 (so 层) 调用了清空 iptables 的指令
```bash
su -c iptables -F
su -c iptables -X
```
如何解决呢？
<!-- more -->
修改 app 不太现实，这个 app 签名效验之类的做得很死，而且混淆严重，不太能理清验证逻辑。

hook system 调用呢？这个 app 发挥作用的本身就是一个 magisk 的 riru 模块。此外清空 iptables 在很多地方都做了，不一定能 hook 干净。

我尝试了用 magisk 模块直接替换掉`/system/bin/iptables`,可是替换后系统就无法正常联网了 (原因未知)。最后，我终于找到了一种不修改原来 iptables 实现劫持调用的方法：**利用系统 PATH 的优先级**。
在我的安卓 11 设备上，在 adb shell 中输入`$PATH`获取的的 PATH 如下：

```bash
/product/bin
/apex/com.android.runtime/bin
/apex/com.android.art/bin
/system_ext/bin
/system/bin
/system/xbin
/odm/bin
/vendor/bin
```

需要指出的是，系统在查找可执行文件时是依照 PATH 顺序从前往后查找的。原本的 iptables 在`/system/bin`目录下，可见`/product/bin`,`/system_ext/bin`优先级都比它高，而恰恰 magisk 提供了挂载文件到这两个目录的能力。经过我的测试，确实可以将自己写的 iptables 挂载到`/product/bin`来实现劫持对`iptables`的调用。

自己写的 iptables 代码也很简单，在对传入的参数进行审查后再使用绝对路径调用`/system/bin/iptables`

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
int main(int argc, char *argv[])
{
    char *cmd = (char *)malloc(1024);
    memset(cmd, 0, 1024);
    strcpy(cmd, "/system/bin/iptables");
    for (int i = 1; i < argc; i++)
    {
        strcat(cmd, " ");
        strcat(cmd, argv[i]);
    }
    if (strstr(cmd, "-F") ||strstr(cmd, "-X") || strstr(cmd, "-t nat -F") ||strstr(cmd, "-t nat -X"))
    {
        printf("Permission denied--From fake iptables\n");
        return 0;
    }
    // printf("%s", cmd);
    system(cmd);
    free(cmd);
    return 0;
}
```

将 c 程序使用 ndk 编译即可。另外提一点就是编译好的程序要放在 magisk 模块的`\system\product\bin`路径中，magisk 会自动将其挂载到`\product\bin`。

在安卓 11 以下，magisk 的 su 存储在最高优先级的`/sbin`路径中，而安卓 11 之后取消了这个路径，所以利用这一点，我们甚至可以劫持 magisk 的 su 来实现更多元而相对修改 magisk 更简单的定制。

防范这种劫持的方法也很简单，在调用时使用绝对路径`/system/bin/iptables`即可，当然，这不免失去了一些兼容性。