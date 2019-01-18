const scheduling = require("./scheduling");
const readlineSync = require('readline-sync');

let path_dvd, path_ems;

path_dvd = readlineSync.question("Enter path to (or click and drag here) DAVID'S FILE: ");
path_ems = readlineSync.question("Enter path to (or click and drag here) THE EMS FILE: ");

try {
    scheduling(path_ems, path_dvd);
} catch(e){
    console.log();
    console.error(e.message);
    console.log();
}
