const express = require("express");
const app = express();
const server = require("http").createServer(app);
const { QuickDB, MySQLDriver } = require("quick.db");
const si = require('systeminformation');
const os = require("os");
const pretty = require('prettysize');
const moment = require("moment");
const fs = require('fs');
const config = require('./config.json')
const exec = require('child_process').exec;
const PORT = config.WebServer;

//Connect Quick.DB to MySQL
(async () => {
    const mysqlDriver = new MySQLDriver({
        host: config.MySQL.Host,
        user: config.MySQL.User,
        password: config.MySQL.Pass,
        database: config.MySQL.DB,
    });

    await mysqlDriver.connect().then(msg => {
        console.log("Connected")
    })

//Automatic 30second git pull.
setInterval(() => {
    exec(`git pull`, (error, stdout) => {
        let response = (error || stdout);
        if (!error) {
            if (response.includes("Already up to date.")) {
                //console.log('Bot already up to date. No changes since last pull')
            } else {
                exec("service danbot restart");
            }
        }
    })
}, 30000)

//Issue speedtest on startup
fetchData();

//Get data and store in the database
setInterval(async () => {
    fetchData()
}, 2000)

/*
setInterval(async () => {
    dockers();
}, 60000)
*/

app.get("/states", (req, res) => {
    if (req.headers.password === config.password) {
        fs.readFile('/var/lib/pterodactyl/states.json', { encoding: "utf-8" }, (err, data) => {
            let servers = Object.entries(JSON.parse(data)).filter(x => x[1].toLowerCase() == 'offline').map(x => x[0]);

            res.json(servers)
        });
    } else {
        res.send('Invalid or no password provided.')
    }
})

app.get("/", (req, res) => {
    res.sendStatus(418)
});

app.get('/stats', async function (req, res) {
    if (req.headers.password === config.password) {
        const db = new QuickDB({ driver: mysqlDriver });
        let data = {
            info: await db.get(os.hostname())//,
            //speedtest: nodeData.fetch("data-speedtest"),
            //docker: await si.dockerAll(),
            //discord: nodeData.fetch('discord')
        }
        res.send(data)
    } else {
        res.sendStatus(403)
    }
})

app.get('/wings', function (req, res) {
    if (req.headers.password === config.password) {
        console.log(req.query)
        if (!req.query.action) {
            res.json({ status: "You forgot to send start/restart/stop in the request" })
        } else if (req.query.action === "start") {
            res.json({ status: "Wings started" })
            exec(`service wings start`)
        } else if (req.query.action === "restart") {
            res.json({ status: "Wings restarted" })
            exec(`service wings restart`)
        } else if (req.query.action === "stop") {
            res.json({ status: "Wings stopped" })
            exec(`service wings stop`)
        }
    } else {
        res.sendStatus(403)
    }
})

server.listen(PORT, function () {
    console.log("Waiting for connections...");
});

//DATA COLLECTION
async function fetchData() {
    const db = new QuickDB({ driver: mysqlDriver });

    //Data using the systeminformation package.
    let memdata = await si.mem();
    let diskdata = await si.fsSize();
    let netdata = await si.networkStats();
    let osdata = await si.osInfo();
    let docker = await si.dockerInfo();
    let cl = await si.currentLoad();
    let cpudata = await si.cpu();
    let wings = await si.services('wings');

    //OS UPTIME
    let uptime = os.uptime();
    let d = Math.floor(uptime / (3600 * 24));
    let h = Math.floor(uptime % (3600 * 24) / 3600);
    let m = Math.floor(uptime % 3600 / 60);
    let s = Math.floor(uptime % 60);
    let dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
    let hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
    let mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
    let sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";

    await db.set(os.hostname(), {
        servername: os.hostname(),
        cpu: cpudata.manufacturer + " " + cpudata.brand,
        cpuload: cl.currentload.toFixed(2),
        cputhreads: cpudata.cores,
        cpucores: cpudata.physicalCores,
        memused: pretty(memdata.active),
        memtotal: pretty(memdata.total),
        memusedraw: memdata.active,
        memtotalraw: memdata.total,
        diskused: pretty(diskdata[0].used + diskdata[1].used),
        disktotal: pretty(diskdata[0].size + diskdata[1].size),
        diskusedraw: diskdata[0].used +  + diskdata[1].used,
        disktotalraw: diskdata[0].size + diskdata[1].size,
        netrx: pretty(netdata[0].rx_bytes),
        nettx: pretty(netdata[0].tx_bytes),
        osplatform: osdata.platform,
        oslogofile: osdata.logofile,
        osrelease: osdata.release,
        osuptime: dDisplay + hDisplay + mDisplay + sDisplay,
        datatime: Date.now(),
        dockercontainers: docker.containers,
        dockercontainersrunning: docker.containersRunning,
        dockercontainerspaused: docker.containersPaused,
        dockercontainersstopped: docker.containersStopped,
        wingstatus: wings[0].running,
        wingsramusage: wings[0].pmem,
        updatetime: moment().format("YYYY-MM-DD HH:mm:ss")
    });
}
})();
