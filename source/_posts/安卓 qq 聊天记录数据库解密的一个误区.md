---
title: 安卓 qq 聊天记录数据库解密的一个误区
date: 2023-03-07 10:56:00
categories: 逆向
tags: [逆向, 安卓]
url: /2023/03/07/安卓 qq 聊天记录数据库解密的一个误区/
---

安卓解密的具体方法我就不再赘述了，大体方法都是正确的，这里只讲我遇到的问题。

其实这个问题应该是在 Java 外的语言中才会出现，安卓 QQ 的加密方法是写在 so 层的，传入的是 Java 层的 `String.toCharArray()`，然后将每个 char 异或一次。这里就会涉及到编码的问题。

<!-- more -->

众所周知 UTF-8 是变长编码的，可能的字节数为 1-4。但是 Java 中`toCharArray`使用的编码并不是 UTF-8，而是 UTF-16BE。在 UTF-8 长度为四个字节的情况下（例如某些 emoji），UTF-16BE 会将其转换为两个 char，如果我们再按照一个 char 去解密，就会出现乱码。

此处给出正确的解密 python 代码：
```python
import struct

def utf8_to_unicode_arr(utf8_bytes):
    string = utf8_bytes.decode('utf-8').encode('utf-16be')
    string = struct.unpack(f'>{len(string)//2}H', string)
    return list(string)


def convert_to_utf8(char_array):
    binary_data = struct.pack(
        f'>{len(char_array)}H', *char_array)
    utf8_bytes = binary_data.decode('utf-16be').encode('utf-8')
    return utf8_bytes.decode('utf-8')


def decrypt(data, key):
    if not data:
        return data
    msg = b''
    if type(data) == bytes:
        msg = b''
        for i in range(0, len(data)):
            msg += bytes([data[i] ^ ord(key[i % len(key)])])
        return msg
    elif type(data) == str:
        code_points = utf8_to_unicode_arr(data.encode("utf-8"))
        for i in range(0, len(code_points)):
            code_points[i] ^= ord(key[i % len(key)])
        return convert_to_utf8(code_points)
    else:
        return data

print(decrypt(b'xWVYQTDXOC\x10[^^OEC\xc2\x90~\x14\xf0\x93\x8c\x8b'.decode(), "02:00:00:00:00:00"))
# 输出：Helianthus annuus L.🌻
```

当然，在字节长度 1-3 的情况下，直接按照 UTF-8 解密也是可以的，但是在字节长度为 4 的情况下，就会出现乱码，需要特别注意。