const keepLiveURL = ("https://" + process.env.PROJECT_DOMAIN + ".glitch.me")
const express = require("express");
const app = express();
const exec = require("child_process").exec;
const os = require("os");
const fs = require("fs");
const path = require("path");
const {createProxyMiddleware} = require("http-proxy-middleware");
// 配置 start
const serverPort = 3000;
const eCmdPwd = "kons-ensitiveheng-lexicon";
// 读取config.json
const configPath = path.resolve(__dirname, "config.json");
// 配置列表
let proxyConfig = [
    {path: '/test', target: 'https://www.baidu.com'},
];
// 配置 end

// json 解析
app.use(express.json());

// config
app.get("/config", (req, res) => {
    res.status(200).sendFile(__dirname + "/config.html");
});

// readConfig
function readConfig() {
    if (!fs.existsSync(configPath)) {
        // 创建文件
        fs.writeFileSync(configPath, JSON.stringify(proxyConfig));
    }
    proxyConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return proxyConfig;
}

// configs
app.get("/configs", (req, res) => {
    let pwd = req.header("pwd")
    if (pwd !== eCmdPwd) {
        res.status(401).json({msg: "密码错误", code: 401});
        return;
    }
    res.status(200).json({msg: '', code: 200, data: readConfig()});
});

// editConfig
app.post("/configs", (req, res) => {
    let pwd = req.header("pwd")
    if (pwd !== eCmdPwd) {
        res.status(401).json({msg: "密码错误", code: 401});
        return;
    }
    let config = req.body;
    if (config === undefined || config === "") {
        res.status(500).json({msg: "配置不能为空!", code: 500});
        return;
    }
    fs.writeFileSync(configPath, JSON.stringify(config));
    res.status(200).json({msg: "保存成功", code: 200});
});

app.get("/", (req, res) => {
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

// cmd 返回 cmd.html
app.get("/cmd", (req, res) => {
    res.status(200).sendFile(__dirname + "/cmd.html");
});

// eCmd
app.post("/eCmd", (req, res) => {
    let pwd = req.header("pwd")
    if (pwd !== eCmdPwd) {
        res.status(401).json({msg: "密码错误", code: 401});
        return;
    }
    let cmdStr = req.body.cmd;
    if (cmdStr === undefined || cmdStr === "") {
        res.status(500).json({msg: "命令不能为空!", code: 500});
        return;
    }
    exec(cmdStr, function (err, stdout) {
        if (err) {
            res.status(500).json({msg: "命令行执行错误：\n" + err, code: 500});
        } else {
            res.status(200).json({msg: stdout, code: 200});
        }
    });
});

// 动态代理中间件
const dynamicProxyMiddleware = (req, res, next) => {
    readConfig();
    let target = '';

    // 根据配置列表动态设置目标URL
    for (const config of proxyConfig) {
        if (req.path.startsWith(config.path)) {
            target = config.target;
            break;
        }
    }

    // 如果找不到匹配的目标URL，直接调用下一个中间件
    if (!target) {
        return next();
    }

    // 动态创建代理中间件
    const proxy = createProxyMiddleware({
        target: target,
        changeOrigin: true,
        ws: true,
        pathRewrite: (path, req) => {
            // 根据配置重写路径
            for (const config of proxyConfig) {
                if (req.path.startsWith(config.path)) {
                    return path.replace(config.path, '/');
                }
            }
            return path;
        },
        secure: false,
        selfHandleResponse: false
    });

    // 调用代理中间件处理请求
    proxy(req, res, next);
};

// 使用动态代理中间件
app.use(dynamicProxyMiddleware);

// 拦截404
app.use(function (req, res, next) {
    res.status(404).sendFile(__dirname + "/404.html");
});


/* keepalive  begin */

// pm2 自启动函数
function pm2Resurrect() {
    exec("pm2 resurrect", function (err) {
        if (err) {
            console.debug("pm2 resurrect: " + err);
        } else {
            console.debug("pm2 resurrect success!");
        }
    });
}

function keepalive() {
    // 1.请求主页，保持唤醒
    exec("curl -m5 " + keepLiveURL, function (err, stdout, stderr) {
        if (err) {
            console.log("保活-请求主页-命令行执行错误: " + err);
        } else {
            console.log("保活-请求主页-命令行执行成功，响应报文: " + stdout);
        }
    });
    //2.pm2 恢复进程
    pm2Resurrect();
}

setInterval(keepalive, 9 * 1000);
/* keepalive  end */

app.listen(serverPort, () => {
    console.log(`App listening on port ${serverPort}!`)
});