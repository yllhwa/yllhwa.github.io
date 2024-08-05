---
title: vv.meme 谜题游戏 write up
date: 2024-08-05 00:19:00
categories: CTF
tags: [CTF]
url: /vv_meme-game-wp/
---

## Story #0

### 0.1

点击`开始`，网页跳转到`?level=key`。

### 0.2

文字闪烁，最后变成`?level=time`。

### 0.3

打开控制台，可以看到输出

```
Hey inspector 🕵️, next level is ?level=classes
```

### 0.4

随意填写，提示

```
你的答案不正确，请再试一次。(哎，你听说过 World of Warcraft 吗？
```

搜索`Vitalik Buterin ETH World of Warcraft`，找到[一篇文章](https://www.polygon.com/22709126/ethereum-creator-world-of-warcraft-nerf-nft-vitalik-buterin)。

从文中我们可以得知被削弱的角色名称为`warlock`，将答案填入得到`?level=cicada3301`。

## Story #1

### 1.1

检查图片，发现 alt 信息：`7 is the magic number`。

下载图片，使用二进制编辑器（如 010editor、winhex）查看文件末尾得到字符串

```
CAESAR says Ò?slcls=ihshujl
```

容易联想到凯撒密码，结合前面的 alt 信息，容易知道凯撒密码的偏移量为 7（实际上凯撒密码偏移量有限，可以枚举）。

得到解密结果：`?level=balance`

### 1.2

根据提示：`想要财富，你得尝试拥有财富！`

尝试点击最上方的 Buy 按钮，再点击 Buy，此时下方会短暂出现彩色字符串：`?level=console`

### 1.3

考虑到 url 中的 console，打开控制台，得到提示：

```
David A. Huffman:
 Smart kid, I've got something for you.
 Use these tools wisely: `frequency`, and `getTree(freq: [string, number][])`.
 Each one is a key to unlocking the secrets of Huffman coding.
 Are you ready to accept the challenge and decrypt the message?

You can try typing `frequency` or `getTree`
```

```javascript
> frequency
'[["e",13],[" ",11],["t",10],["l",6],["i",6],["r",5],["s",5],["c",4],["y",4],["a",3],["n",3],["u",3],["o",3],["d",2],["v",2],["m",2],["p",2],["w",1],["z",1],["f",1]]'

> getTree([["e",13],[" ",11],["t",10],["l",6],["i",6],["r",5],["s",5],["c",4],["y",4],["a",3],["n",3],["u",3],["o",3],["d",2],["v",2],["m",2],["p",2],["w",1],["z",1],["f",1]])
{
    weight: 87
    ...
}
```

`这棵树有多重？ 🌲`的答案自然就是 87。

得到 Story #1 的钱包助记词和下一关的线索：`?level=nameless`

## Story #2

### 2.1

将图片拖动开，发现图片下方有一行文字：

```
"/shares/mint" > 取一个好听的名字吧!
```

根据漫画内容：`Johan was such a wonderful name, too.`

尝试在 Name 项填写 johan，得到提示：

```
johan, it's wornderful name!"/shares/1?level=johan"
```

同时还需要注意到左侧的图片拖动开，下方有下一个环节的提示：

```
負貳拾柒點壹貳伍捌
負壹佰零玖點叁肆玖柒
puzzle
story#2
```

### 2.2

根据上一题得到的线索和这一题框内的格式，填入`-27.1258,-109.3497`。

得到下一关的线索：`?level=ffmpeg`

### 2.3

没有名字的怪物下方有对比度较低的链接：[>download it<](https://customer-24qrm0yd83ngifrn.cloudflarestream.com/e159e2011278b88fa5ac1a654f4828ad/downloads/default.mp4)

下载视频后，右键属性，查看详细信息（Windows），在备注中发现：

```
JOHAN SAY I'M HERE: aHR0cHM6Ly9maWxlLmlvL3dIdlBGUFhaUTEyQg==
```

base64 解码得到：`https://file.io/wHvPFXQaQ12B`

由于此文件阅后即焚，后面的部分我没有做。

## Story #3

### 3.1

“回家”可以点击，点击后会跳转到`/shares/simulator`。

不过这道题我没看出来怎么得到下一步 `?level=income`的，所以在 js 里面直接看路由！（。

好，这下全出现了 /doge。

```javascript
case "income":
    return {
        level: "3.1",
        name: "income",
        puzzleId: 3,
        puzzleStep: 1
    };
case "prime":
    return {
        level: "4.0",
        name: "prime",
        puzzleId: 4,
        puzzleStep: 0
    };
case "rsa":
    return {
        level: "4.1",
        name: "rsa",
        puzzleId: 4,
        puzzleStep: 1
    };
```

### 3.2
将图片拖动移开，下方有低对比度提示：
```
5, 2, 3.9, 611, 5, 5, 1.5, 30, 20
```

将这些数字作为参数输入之前点击回家进入的`/shares/simulator`（准确来说只用修改 seed）。

将 ETH 的 INCOME 值 3.31 填入，得到下一关线索 `?level=prime`。

## Story #4
### 4.1
同样 js 逆向，全局搜索这两串二进制字符，发现可疑函数
```javascript
function r(e, s) {
    let l = e.padStart(s, "0").split("").map(e=>"0" === e ? "1" : "0").join("");
    return BigInt("0b".concat(l))
}
```
返回出打断点，随意输入并提交，得到两个素数：
```
p = 5999999999999999572748252001150206112289036460627182991960108783775851893058681618663736251
q = 999999999999999966484112715463900049825186092620125502979674597309179755437379230686901031
```

提交得到下一关线索 `?level=rsa` 和 `e = 65537`。

### 4.2
容易想到是使用 RSA 解密，不过我用 python 不知道为啥解不出来，把私钥导出来去在线网站解密。
```python
import base64

p = 5999999999999999572748252001150206112289036460627182991960108783775851893058681618663736251
q = 999999999999999966484112715463900049825186092620125502979674597309179755437379230686901031
e = 65537
message = "AMVgHu7BK1/aEisp46Fg2y5x28OSM/rofwtQrjT0J/L0TXACdLP1uDMoGoq9C3hozEzDzysV/VTzLwxdMKKHP13IBitX1O6gUTYczg=="

import gmpy2
from Crypto.Util.number import long_to_bytes, bytes_to_long

c = bytes_to_long(base64.b64decode(message))
n = q * p
phi = (p - 1) * (q - 1)
d = gmpy2.invert(e, phi)
m = pow(c, d, n)
print(long_to_bytes(m))


import rsa

private_key = rsa.PrivateKey(n, e, d, p, q)
print(private_key.save_pkcs1("PEM").decode())

print("p=0x%x" % p)
print("q=0x%x" % q)
print("e=0x%x" % e)
print("d=0x%x" % d)
```

解密得到`DM @ashu_mest with pqed`。

去 Twitter 私信作者 RSA 的参数p、q、e、d即可。
