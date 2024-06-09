const express = require("express");
const app = express();
const exec = require("child_process").exec;
const os = require("os");
const {createProxyMiddleware} = require("http-proxy-middleware");
const axios = require("axios");
// 配置 start
const serverPort = process.env.SERVER_PORT || 3000;
// 反代目标
const proxyTarget = process.env.PROXY_TARGET || "https://www.baidu.com";
// 配置 end

// json 解析
app.use(express.json());

app.get("/hello", (req, res) => {
    res.status(200).send(`${Date.now()} - hello world!`);
});

//获取系统版本、内存信息
app.get("/info", (req, res) => {
    let cmdStr = "cat /etc/*release | grep -E ^NAME";
    exec(cmdStr, function (err, stdout) {
        if (err) {
            res.status(500).send("命令行执行错误：" + err);
        } else {
            res.status(200).send(
                "命令行执行结果：\n" +
                "Linux System:" +
                stdout +
                "\nRAM:" +
                os.totalmem() / 1000 / 1000 +
                "MB"
            );
        }
    });
});


// 使用代理中间件
app.all("/", createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        pathRewrite: {"^/": "/"},
        secure: false,
        selfHandleResponse: false
    })
);

// 拦截404
app.use(function (req, res) {
    res.status(404).send(Html_404);
});


/* keepalive  begin */
function keepAlive() {
    const PROJECT_DOMAIN = process.env.PROJECT_DOMAIN;
    if (PROJECT_DOMAIN) {
        const keepLiveURL = ("https://" + PROJECT_DOMAIN + ".glitch.me" + "/hello")
        axios.get(keepLiveURL).then((response) => {
            console.log("保活-请求主页-axios请求成功，响应报文: " + response.data);
        }).catch((error) => {
            console.log("保活-请求主页-axios请求失败: " + error);
        })
    }
}

// pm2 自启动函数
function pm2Resurrect() {
    exec("pm2 resurrect && pm2 save --force", function (err) {
        if (err) {
            console.log("pm2 resurrect: " + err);
        } else {
            console.log("pm2 resurrect success!");
        }
    });
}

setInterval(() => {
    // 1.请求主页，保持唤醒
    keepAlive();
    //2.pm2 恢复进程
    pm2Resurrect();
}, 9 * 1000);
/* keepalive  end */

app.listen(serverPort, () => {
    console.log(`App running at http://127.0.0.1:${serverPort}`)
    console.log(`ProxyTarget: ${proxyTarget}`)
});


const Html_404 = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <title>404 Page Not Found</title>
</head>
<body>
<div class="error-page">
    <div class="error-message">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>We're sorry, but the page you requested cannot be found.</p>
    </div>
</div>
</body>
<style>
    * {
        margin: 0;
        padding: 0;
    }

    body {
        background-color: #f5f5f5;
        font-family: Arial, sans-serif;
    }

    .error-page {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }

    .error-message {
        background-color: #fff;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        padding: 40px;
        text-align: center;
    }

    h1 {
        color: #d22;
        font-size: 6rem;
        margin-bottom: 20px;
    }

    h2 {
        color: #333;
        font-size: 3rem;
        margin-bottom: 20px;
    }

    p {
        color: #666;
        font-size: 1.2rem;
        margin-bottom: 40px;
    }
</style>
</html>`;