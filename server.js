const keepLiveURL = ("https://" + process.env.PROJECT_DOMAIN + ".glitch.me")
const express = require("express");
const app = express();
const exec = require("child_process").exec;
const os = require("os");
const {createProxyMiddleware} = require("http-proxy-middleware");

// 配置 start
const serverPort = 3000;
const eCmdPwd = "kons-ensitiveheng-lexicon";
const proxyURL = "https://www.baidu.com";

// 配置 end

const eCmdRequest = {
    pwd: String,
    cmd: String
}
const eCmdResponse = {
    code: Number,
    msg: String
}

app.use(express.json());

app.get("/", (req, res) => {
    res.send(`${Date.now()} - hello world!`);
});

//获取系统版本、内存信息
app.get("/info", (req, res) => {
    let cmdStr = "cat /etc/*release | grep -E ^NAME";
    exec(cmdStr, function (err, stdout) {
        if (err) {
            res.send("命令行执行错误：" + err);
        } else {
            res.send(
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
    res.sendFile(__dirname + "/cmd.html");
});

// eCmd
app.post("/eCmd", (req, res) => {
    if (req.body.pwd !== eCmdPwd) {
        res.json({msg: "密码错误", code: 500});
        return;
    }
    let cmdStr = req.body.cmd;
    if (cmdStr === undefined || cmdStr === "") {
        res.json({msg: "命令不能为空!", code: 500});
        return;
    }
    exec(cmdStr, function (err, stdout) {
        if (err) {
            res.json({msg: "命令行执行错误：" + err, code: 500});
        } else {
            res.json({msg: "命令行执行结果：" + stdout, code: 200});
        }
    });
});

// 反代
app.use("/index", createProxyMiddleware({
        target: proxyURL, // 需要跨域处理的请求地址
        changeOrigin: true, // 默认false，是否需要改变原始主机头为目标URL
        ws: true, // 是否代理websockets
        pathRewrite: {
            "^/index": "/" // 重写路径
        },
        secure: false,
        selfHandleResponse: false
    })
);

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