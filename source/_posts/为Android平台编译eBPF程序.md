---
title: 为 Android 平台编译 eBPF 程序
date: 2022-06-15 10:23:39
categories: 逆向
tags: [安卓, 逆向, eBPF]
---

### 背景
最近在分析一个安卓程序，然而这个安卓程序混淆比较复杂，并且有许多反调试点。在苦恼的同时我又在思考，既然我们已经取得了系统的 Root 权限，照理说我们完全可以不必再在用户层和程序做对抗。如果我们能够上升到内核中对程序做全面的监控，就可以实现一个类似火绒剑的工具，帮助我们分析程序的行为（文件操作、网络 IO 等），而普通的程序完全没有反抗的能力，岂不美哉？  
然而安卓系统的内核修改编译工作并不简单，而直接对内核进行修改耗时耗力，成果往往限制于某个机型不能通用，甚至造成内核崩溃之类的后果。  
<!-- more -->
### eBPF 简介
简单来说，eBPF 是 Linux 内核中一个非常灵活与高效的类虚拟机（virtual machine-like）组件，能够在许多内核 hook 点安全地执行字节码（bytecode）。很多内核子系统都已经使用了 BPF，例如常见的网络、跟踪与安全。  
当然，这是 linux 内核中比较新的特性，可能需要较新的手机才搭载了比较完美支持 eBPF 的内核。

### 安卓平台 eBPF 的编译

网络上关于 eBPF 的资料少之又少，不过大致上总结出的编译方法有如下几种：  
1. 使用 adeb 编译  
    adeb 类似于 linux deploy 等，利用 chroot 技术在安卓手机上运行一个 Debian 虚拟机，可以利用这个环境安装 BCC（eBPF 的一个工具库）等。
    这个方法测试可行，但是比较麻烦，还要解决很多依赖问题，体验不是很好。
2. 完全下载 AOSP 项目，增加代码后进行编译
   无需多言，这种方法更加复杂，还要占用相当多的空间且完全无用，非常不优雅。

在进行一天的研究后我终于发现了一个简单的交叉编译 eBPF 的方法供安卓平台使用。  
首先，其实谷歌是给了 eBPF 的文档的，可惜只有寥寥几篇。还好我们尚可管中窥豹，对编译过程有一些了解。在阅读谷歌最新的 Soong 编译系统源码后我们能够找到关于 eBPF 程序的编译代码，位于[bpf.go](https://android.googlesource.com/platform/build/soong/+/master/bpf/bpf.go)。
其中的关键：
```go
Command:"$ccCmd --target=bpf -c $cFlags -MD -MF ${out}.d -o $out $in",
```
可见最终还是调用 clang 进行编译。再查找 cFlags，在：
```go
cflags := []string{
		"-nostdlibinc",
		// Make paths in deps files relative
		"-no-canonical-prefixes",
		"-O2",
		"-isystem bionic/libc/include",
		"-isystem bionic/libc/kernel/uapi",
		// The architecture doesn't matter here, but asm/types.h is included by linux/types.h.
		"-isystem bionic/libc/kernel/uapi/asm-arm64",
		"-isystem bionic/libc/kernel/android/uapi",
		"-I       frameworks/libs/net/common/native/bpf_headers/include/bpf",
		// TODO(b/149785767): only give access to specific file with AID_* constants
		"-I       system/core/libcutils/include",
		"-I " + ctx.ModuleDir(),
	}
```
这些便是编译选项。我们可以依照这些信息写出 MakeFile。
```makefile
ebpf-build:
	clang \
	--target=bpf \
	-c \
	-nostdlibinc -no-canonical-prefixes -O2 \
	-isystem bionic/libc/include \
	-isystem bionic/libc/kernel/uapi \
	-isystem bionic/libc/kernel/uapi/asm-arm64 \
	-isystem bionic/libc/kernel/android/uapi \
	-I       system/core/libcutils/include \
	-I       system/bpf/progs/include \
	-MD -MF example.d -o example.o src/example.c
```
这些选项中，`-isystem`和`-I`都是引入 include 库的选项，那么这些库在哪里去找呢？很简单，这个编译程序原本是在 AOSP 项目中运行的，我们只需要取 AOSP 项目中查找这些文件即可。
稍加寻找我们可以找到这些文件分别在
1. [bionic](https://android.googlesource.com/platform/bionic/)
2. [core](https://android.googlesource.com/platform/system/core/)
3. [bpf](https://android.googlesource.com/platform/system/bpf/)

需要注意的是这些仓库都有很多分支，下载的时候注意指定需要的分支（如 android11 就指定 android11 的分支）
```bash
git clone -b android11-gsi https://android.googlesource.com/platform/bionic
git clone -b android11-gsi https://android.googlesource.com/platform/system/core/
git clone -b android11-gsi https://android.googlesource.com/platform/system/bpf/
```
注意文件夹组织结构，参考 AOSP 中的结构即可
```bash
├── bionic
└── system
    ├── core
    └── bpf

```
下载好之后安装一下 clang 之类（报错缺什么装什么），代码写好，然后 make 就可以了。
注意我写的 makefile
```makefile
ebpf-build:
	clang \
	--target=bpf \
	-c \
	-nostdlibinc -no-canonical-prefixes -O2 \
	-isystem bionic/libc/include \
	-isystem bionic/libc/kernel/uapi \
	-isystem bionic/libc/kernel/uapi/asm-arm64 \
	-isystem bionic/libc/kernel/android/uapi \
	-I       system/core/libcutils/include \
	-I       system/bpf/progs/include \
	-MD -MF example.d -o example.o src/example.c
```
源代码在src/example.c，最后输出example.o（eBPF文件）和example.d（依赖文件，没什么用）

这里我随便用了一个 eBPF 代码如下：
```c
#include <linux/bpf.h>
#include <stdbool.h>
#include <stdint.h>
#include <bpf_helpers.h>

DEFINE_BPF_MAP(cpu_pid_map, ARRAY, int, uint32_t, 1024);

struct switch_args {
    unsigned long long ignore;
    char prev_comm[16];
    int prev_pid;
    int prev_prio;
    long long prev_state;
    char next_comm[16];
    int next_pid;
    int next_prio;
};

SEC("tracepoint/sched/sched_switch")
int tp_sched_switch(struct switch_args* args) {
    int key;
    uint32_t val;

    key = bpf_get_smp_processor_id();
    val = args->next_pid;

    bpf_cpu_pid_map_update_elem(&key, &val, BPF_ANY);
    return 0;
}

char _license[] SEC("license") = "GPL";
```
编译完成后将产生的`example.o`文件放到安卓系统的`/system/etc/bpf/`即可。system 分区不可写的设备用 magisk 挂载也是可以的，安卓系统会在启动时自动从这个目录下加载 eBPF 文件。

重启后我们可以看到系统已经成功加载了 eBPF 程序
```bash
apollo:/ # ls /sys/fs/bpf | grep example
map_example_cpu_pid_map
prog_example_tracepoint_sched_sched_switch
```
至于 eBPF 程序和用户态程序的通信等等，我也还在学习中，总之已经先把编译问题解决了。
