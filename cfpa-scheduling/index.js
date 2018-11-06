const innerjoin = require("inner-join");
const excelToJson = require('convert-excel-to-json');
const stringHash = require("string-hash");
 
function getDataFromFile(filename, sheetName){
    const result = excelToJson({
        sourceFile: filename,
        header: {
            rows: 1
        },
        columnToKey: {
            '*': '{{columnHeader}}'
        },
        sheets: [sheetName]
    });
    return Object.values(result[sheetName]);
}

const EMS_FILE_NAME = "ems.xls";
const DAVID_SCHED_FILE_NAME = "david.xlsx";

function firstIndexOnOrAfter(events, startDate, key="Date"){
    for(let i=0; i<events.length; i++){
        /* Did we find the first event? */
        if(events[i][key] >= startDate) return i;

        /* If first even is missing, give index before it */
        // if(events[i][key] > startDate) return i-1;
    }
    return -1;
}
function lastIndexOnOrBefore(events, lastDate, key="Date"){
    for(let i=0; i<events.length; i++){
        /* Did we find the first event? */
        if(events[i][key] === lastDate) return i;

        /* If first even is missing, give index before it */
        if(events[i][key] > lastDate) return i-1;
    }
    return -1;
}

function getRowId(row){
    let dateKey, nameKey, roomKey;
    nameKey = "Booking Event Name";
    roomKey = "Room Description";
    if(row["Booking Date"]){
        dateKey = "Booking Date";
    } else {
        dateKey = "Date";
    }
    let str = String(row[dateKey]) + row[nameKey] + row[roomKey];
    return stringHash(str);
}

function getIndexById(id, array){
    for(let i=0; i<array.length; i++){
        if(array[i]._id === id) return i;
    }
    return -1;
}

function eventToString(event){
    let dateKey, nameKey, roomKey;
    let date;
    nameKey = "Booking Event Name";
    roomKey = "Room Description";
    if(event["Booking Date"]){
        dateKey = "Booking Date";
    } else {
        dateKey = "Date";
    }

    try{
        date = event[dateKey].toDateString();
    } catch(e) {
        date = "UNKNOWN DATE";
    }
    return `${date}\t${event[nameKey]}`;
}

function main(){
    // read both sheets
    let emsEvents = getDataFromFile(EMS_FILE_NAME, "Sheet");
    let dvdEvents = getDataFromFile(DAVID_SCHED_FILE_NAME, "Events");

    // find first and last dates on EMS sheet (smaller range)
    let firstEventDate = emsEvents[0]["Booking Date"];
    let lastEventDate  = emsEvents[emsEvents.length-1]["Booking Date"];

    let firstIdx = firstIndexOnOrAfter(dvdEvents, firstEventDate);
    let lastIdx  = lastIndexOnOrBefore(dvdEvents, lastEventDate);

    // in David's sheet, throw away cells before first date and after last date
    console.log(`${dvdEvents.length} events originally`);
    dvdEvents.splice(lastIdx);
    dvdEvents.splice(0, firstIdx);
    console.log(`Now ${dvdEvents.length} events (${emsEvents.length} in other)`);

    console.log(getRowId(dvdEvents[0]));
    console.log(getRowId(emsEvents[0]));

    dvdEvents.map(event => {
        event._id = getRowId(event);
        return event;
    });
    emsEvents.map(event => {
        event._id = getRowId(event);
        return event;
    });

    // Inner join to get a union of events in both sheets
    let ij = innerjoin(dvdEvents, emsEvents, x => x._id);
    console.log(`${ij.length} events in inner joined list`);

    ij.forEach(event => {
        let {_id} = event;
        if(getIndexById(_id, emsEvents) < 0){
            // compare EMS to InnerJoin - events not in EMS sheet were cancelled
            console.log(`Missing from EMS: ${eventToString(event)}`);
        } else if(getIndexById(_id, dvdEvents) < 0){
            // compare David's to IJ - events no in David's were added
            console.log(`Missing from David's sheet: ${eventToString(event)}`);
        }
    });
}

main();

module.exports = main;
