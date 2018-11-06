const scheduling = require("./scheduling");

/* Temp - the filenames we expect to find */
const EMS_FILE_NAME = "ems-small.xlsx";
const DAVID_SCHED_FILE_NAME = "david-small.xlsx";

scheduling(EMS_FILE_NAME, DAVID_SCHED_FILE_NAME);
