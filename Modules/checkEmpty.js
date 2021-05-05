let run = () => {
    const fs = require('fs');

    let VOLUMESDIR = "/var/lib/pterodactyl/volumes/";
    let STATESFILE = "/var/lib/pterodactyl/states.json";


    let stats = require(STATESFILE);
    let empty_and_offline = [];

    let folders = fs.readdirSync(VOLUMESDIR).filter(x => !x.startsWith('.'));

    console.log(folders.length);

    for (const folder of folders) {
        console.log(folder);

        let files = fs.readdirSync(VOLUMESDIR + folder);
        let status = stats[folder] == ('offline' || stats[folder] == null) ? false : true;

        if ((files.length == 0 || (files.length == 1 && (files[0] == 'package.json' || files[0] == 'package-lock.json'))) && !status) empty_and_offline.push(folder)

    }

    return empty_and_offline;
}

module.exports.run = run;
