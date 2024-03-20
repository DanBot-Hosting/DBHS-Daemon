/*
    ____              ____        __     __  __           __  _
   / __ \____ _____  / __ )____  / /_   / / / /___  _____/ /_(_)___  ____ _
  / / / / __ `/ __ \/ __  / __ \/ __/  / /_/ / __ \/ ___/ __/ / __ \/ __ `/
 / /_/ / /_/ / / / / /_/ / /_/ / /_   / __  / /_/ (__  ) /_/ / / / / /_/ /
/_____/\__,_/_/ /_/_____/\____/\__/  /_/ /_/\____/____/\__/_/_/ /_/\__, /
Free Hosting forever!                                            /____/
*/

//Import all packages needed
const config = require("./config.json");
const { QuickDB, MongoDriver } = require("quick.db");
const si = require('systeminformation');
const os = require("os");
const pretty = require('prettysize');

(async () => {

    //Setup and connect to database
    const mongoDriver = new MongoDriver(config.MongoDB);
    await mongoDriver.connect();
    const db = new QuickDB({ driver: mongoDriver });

    //Get data and store in the database
    setInterval(async () => {
        fetchData()
    }, 2000)

    //Collect data to send to Database!
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