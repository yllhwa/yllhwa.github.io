---
title: 新光猫(中兴方案)配置(db_user_cfg.xml)解密方案
date: 2022-01-17 21:31:52
tags:
---

## 前言

家里最近升级了宽带，换了个新光猫(型号 UNG300Z)，心血来潮想进后台开下 ipv6 改改桥接啥的，可惜网上完全没有这个型号猫的信息，其他通用密码试过了也进不去光猫，于是今天鼓捣了一天总算把超级密码给倒腾出来了，顺便逆向了配置的解密方案，特此记录一下。  

新光猫指的是网上那些解密方法都没办法解密的情况下使用的，我查询我这个光猫 20 年八月份才推出，确实算是比较新。

## 说明

本文的通用用户名密码使用的是移动的`CMCCAdmin`,`aDm8H%MdA`，电信/联通可能需要用相应的通用密码。通用用户名密码一般是写死在代码里面的，与超级密码可以动态改变不同。

## 逆向过程记录放在操作步骤后面

## 操作步骤

首先要打开光猫的 telnet:  
访问以下网址即可

```url
http://192.168.1.1/usr=CMCCAdmin&psw=aDm8H%25MdA&cmd=1&telnet.gch
```

然后连接光猫:

```shell
telnet 192.168.1.1
Login: CMCCAdmin
Password: aDm8H%MdA
```

注意 telnet 一段时间无操作会自动断开。  
此时已经进入了光猫，进入配置文件目录:

```shell
cd /userconfig/cfg
```

然后随意使用任何方法导出`db_user_cfg.xml`。
我这个光猫命令比较全，所以我使用了 ftpput 上传到服务器再下载，有的光猫有 usb 口什么的会更加方便。
然后用以下 python 脚本即可解密配置文件(有兴趣可以帮忙打包一下，我 pc 上环境不干净，打包很慢):

```python
from Crypto.Cipher import AES
from binascii import a2b_hex
KEY = b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
def decrypt(text):
    cryptor = AES.new(KEY, AES.MODE_ECB)
    plain_text = cryptor.decrypt(a2b_hex(text))
    return plain_text
cfg_file = open("db_user_cfg.xml", "rb")
dec_file = open("db_user_cfg.decode.xml", "w")
file_header = cfg_file.read(60)
while 1:
    trunk_info = cfg_file.read(12)
    trunk_data = cfg_file.read(65536)
    trunk_real_size = int.from_bytes(trunk_info[0:4], byteorder='big', signed=False)
    trunk_size = int.from_bytes(trunk_info[4:8], byteorder='big', signed=False)
    next_trunk = int.from_bytes(trunk_info[8:12], byteorder='big', signed=False)
    print(trunk_real_size, trunk_size, next_trunk)
    dec_file.write(decrypt(trunk_data.hex()).decode(encoding="utf-8"))
    if next_trunk==0:
        break
```

## 逆向思路与过程

### 找到配置文件

首先通览根目录，与普通的 linux 根目录对比容易关注到`userconfig`文件夹。  
浏览`userconfig`文件夹后我们可以发现`cfg`文件夹中有三个文件值得注意:

```text
db_backup_cfg.xml
db_default_cfg.xml
db_user_cfg.xml
```

可惜`db_user_cfg.xml`和`db_backup_cfg.xml`都是加密的，到这里也没有什么进一步的思路了。

### 浏览网页文件

于是我想到访问光猫时候网页奇怪的后缀`xxx.gch`，这不是一个常见的网页后缀，于是可以全盘扫描 gch 后缀的文件:

```shell
find / -name "*.gch"
```

不难发现全部存放在`/home/httpd`目录下，没看来这是什么语言，但是简单的理解还是能做到，定位到`/home/httpd/auth/impl.gch`中莫名其妙地调用了一个`login`函数，没有从任何地方导入，思路似乎又就此中断了。

### 逆向 httpd

纠结一段时间后 httpd 引起了我的注意，回想起访问光猫 404 界面时最下方有一行小字`Mini web server 1.0 ZTE corp 2005.`。会不会是 httpd 进程有猫腻呢？
全盘搜索一下 httpd，找到了它，在`/sbin/httpd`。导出到 ida 进行逆向分析。  
搜索字符串`login`，果然在`init_extern_funcs`函数中出现了，再看这函数命名，不摆明了刚才追踪不到的 login 函数就是在这儿注册的吗？
{% asset_img 1642426369770.png 1642426369770.png %}
可惜，跟进`si_webd_f_login`是给我看得晕头转向完全找不到北，使用的一些导入函数(出现在 ida imports 栏里)又完全找不到出处(这个可能是我的问题，有什么方便的办法可以查看从哪里导入的请指教)。这条线索又断了。

### 瞎鼓捣

我甚至考虑了 hook 函数来看一下，可惜刚写了个 demo 上传重启之后文件立刻消失了，这条路也走不通。

### 看一眼进程

我决定看一眼进程有没有什么异常，果然有几个看起来不太正常的进程，其中一个便是我们的主角`cpsd`
{% asset_img 1642426380163.png 1642426380163.png %}
从`/bin/cspd`把我们的主角请出来到 ida 做个客，看一眼导出函数，好家伙
{% asset_img 1642426388520.png 1642426388520.png %}
至此已经完成了大半了，接下来的就是些静态分析的工作了，关键的 aes 密码设置在`decry_param`函数里面，密码就是 16 个 0x00 而已。  
文件大体结构可以看这篇文章:[中兴光猫配置文件 db_user_cfg.xml 结构分析及解密](https://www.52pojie.cn/forum.php?mod=viewthread&tid=1005978)，唯一的不同就是数据部分变成了 AES 加密而已。
