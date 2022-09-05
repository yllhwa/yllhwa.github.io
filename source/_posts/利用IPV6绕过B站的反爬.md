---
title: 利用IPV6绕过B站的反爬
date: 2022-09-05 09:06:37
tags:
---
## 背景：
1. b站对高频请求的ip会使用封禁策略，接口会返回-412错误码，若频率更高甚至会拒绝连接。
2. 目前观测到，b站的封ip策略只针对单个ip，不会直接封一个段，**甚至对ipv6的策略一样**。
3. b站服务器支持ipv6
4. 大多数家庭宽带、IDC均可分配得到ipv6，且一般来说至少会划分/64的子网，也就是2^64=18446744073709551616个ipv6地址。
   
## 绕过反爬：
与ipv4的代理池思路相同，至少2^64个的ipv6地址也可以用来组成一个ipv6的代理池。请求b站api时，随机从代理池选择一个ipv6地址使用即可。

不过很多旧的代理工具对ipv6支持不佳，如3proxy会频繁出现hosts失效、路由不通、认证失败等玄学错误，且其性能一般。若您执意要尝试，可以参考这个[脚本](https://github.com/rafaelb128/ipv6-proxy-creator)。

openresty是一个基于nginx和lua的高性能web平台，其反向代理时同nginx一样提供了proxy_bind选项，可以指定请求的时候使用的ip地址，同时还可以利用其lua拓展的能力处理随机选择ip等功能，其性能也毋庸置疑，实乃处理此任务的最佳选择。

不过需要注意的是b站api地址(api.bilibili.com)的解析比较玄学，很多地方解析不到AAAA记录，这种情况下我们需要先解析得到其ipv6地址后将结果指定到hosts中。b站疑似用了dnspod的智能解析，海外ip/教育网等无法解析到ipv6地址，不过家宽/数据流量可以。测试的时候直接dig主域名始终无法得到，需要指定dns服务器为其ns记录的服务器，并且直接dig其cname的域名才可以。如
```bash
dig @ns3.dnsv5.com a.w.bilicdn1.com AAAA
```
具体原因暂且不懂。

## 具体步骤：

1. 拥有一个ipv6地址段。

    部分家宽可能需要光猫改桥接，服务器则可能需要增加ipv6地址。目前没有发现b站海外cdn的ipv6地址，所以海外服务器回程等开销可能较大，最佳选择还是国内家宽/大带宽服务器。

2. 在hosts中添加获取到的ipv6地址。

    ```bash
    >>> dig @ns3.dnsv5.com a.w.bilicdn1.com AAAA
    ;; ANSWER SECTION:
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::9
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::2
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::3
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::4
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::5
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::6
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::7
    a.w.bilicdn1.com.  90  IN  AAAA  2408:8752:e00:205::8
    >>> vi /etc/hosts
    2408:8752:e00:205::5 api.bilibili.com 
    # 地址仅供参考，选择距离服务器最近的
    ```

3. 将ipv6地址添加到网卡上

    生成shell脚本的python代码参考如下：

    ```python
    with open("ifconfig.sh", "w", encoding="utf-8") as f:
        # 修改为你的ipv6前缀
        prefix = "2408:1111:1111:1111:1111:1111:1111:" 
        data = [f"ifconfig eth0 inet6 add {prefix}{hex(i)[2:]}/64" 
        for i in range(1, 500)]
            f.write("\n".join(data))
    ```

    对于windows，类似可得
    ```python
    bat_file = open("ifconfig.bat", "w", encoding="utf-8")
    # 修改为你的ipv6前缀
    prefix = "2408:1111:1111:1111:1111:1111:1111:"
    bat_data = [f"""netsh interface ipv6 add address "WLAN" {prefix}{hex(i)[2:]}/64""" for i in range(1, 500)]
    file_content = "\n".join(data)
    bat_file.write("\n".join(bat_data))
    bat_file.close()
    ```

    注意加上这么多IP地址对路由器和系统的性能可能会有一定影响，不用的时候记得删除（脚本中add部分改为del即可）。

4. 安装openresty

    参考[官方文档](https://openresty.org/cn/linux-packages.html)

5. 修改配置文件

    ```bash
    >>> vi /usr/local/openresty/nginx/conf
    server {
        listen       80;
        server_name  localhost;

        location / {
            set_by_lua_block $bind_ip {
                return '2001:1111:1111:1111:1111:1111:1111:' .. string.format('%x', math.random(1, 500))
            }
            proxy_bind $bind_ip;
            proxy_pass http://api.bilibili.com;
            proxy_set_header Host api.bilibili.com;
        }
    }
    >>> nginx -s reload
    ```

    现在直接将你配置的服务器作为b站服务器请求即可，如`http://127.0.0.1/client_info`，不出意外很难再出现-412的错误。

## 其他
1. 这个方法可能对于其他网站也适合。
2. 漏洞的修复方法即效仿谷歌等，反爬直接封禁一个ipv6段，不过直接封一个段可能会误伤个别采用nat6或者dhcp6接入ipv6(例如教育网)的用户。
