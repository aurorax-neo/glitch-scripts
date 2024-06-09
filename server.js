const express = require("express");
const app = express();
const exec = require("child_process").exec;
const os = require("os");
const {createProxyMiddleware} = require("http-proxy-middleware");
const axios = require("axios");
// 配置 start
const serverPort = process.env.SERVER_PORT || 5000;
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
app.all("/*", createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        pathRewrite: {"^/": "/"},
        secure: false,
        selfHandleResponse: false
    })
);

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