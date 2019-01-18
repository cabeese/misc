const innerjoin = require("inner-join");
const excelToJson = require('convert-excel-to-json');
const stringHash = require("string-hash");

/**
 * Read an excel (.xls or .xlsx) file and return an object with the data.
 * @param {string} filename The excel sheet file name
 * @param {string} sheetName The name of the sheet to read
 */
function readExcelFile(filename, sheetName){
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

/**
 * Find the index of the first event on or immediately after a given date.
 * @param {Array.<Object>} events The list of events to search
 * @param {string} startDate The date of the first event to find
 * @param {string} key The column name for the date property
 * @returns {number} The index of the event, or else -1
 */
function firstIndexOnOrAfter(events, startDate, key="Date"){
    for(let i=0; i<events.length; i++){
        /* Did we find the first event? */
        if(events[i][key] >= startDate) return i;
    }
    return -1;
}

/**
 * Find the index of the last event on or immediately before a given date.
 * @param {Array.<Object>} events The list of events to search
 * @param {string} lastDate The date of the last event to find
 * @param {string} key THe column name for the date property
 */
function lastIndexOnOrBefore(events, lastDate, key="Date"){
    for(let i=0; i<events.length; i++){
        /* Did we find the first event? */
        if(events[i][key] === lastDate) return i;

        /* If first even is missing, give index before it */
        if(events[i][key] > lastDate) return i-1;
    }
    return -1;
}

/**
 * Hash properties of an event to generate a unique ID
 * @param {Object} row The event object to hash
 * @returns {number} The ID of the row
 */
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

/**
 * Find the index of an event with the given ID.
 * @param {number} id The id (hash) of a row
 * @param {Array.<Object>} array The array of events
 */
function getIndexById(id, array){
    for(let i=0; i<array.length; i++){
        if(array[i]._id === id) return i;
    }
    return -1;
}

/**
 * A '.toString()' method for events.
 * @param {Object} event The event to display
 */
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

function main(emsFn, davidFn){
    // read both sheets
    let emsEvents, dvdEvents;
    try{
        emsEvents = readExcelFile(emsFn, "Sheet");
    } catch(e){
        throw new Error("Unable to read that EMS spreadsheet! " +
                        "Check that you provided the correct path.");
    }
    try{
        dvdEvents = readExcelFile(davidFn, "Events");
    } catch(e){
        throw new Error("Unable to read David's spreadsheet! " +
                        "Check that you provided the correct path.");
    }

    // find first and last dates on EMS sheet (smaller range)
    let firstEventDate = emsEvents[0]["Booking Date"];
    let lastEventDate  = emsEvents[emsEvents.length-1]["Booking Date"];

    let firstIdx = firstIndexOnOrAfter(dvdEvents, firstEventDate);
    let lastIdx  = lastIndexOnOrBefore(dvdEvents, lastEventDate);

    // in David's sheet, throw away cells before first date and after last date
    dvdEvents.splice(lastIdx);
    dvdEvents.splice(0, firstIdx);

    // Give each row (in both sheets) an ID. The same event should hash to the
    // same _id in both sheets so we can compare them quickly
    dvdEvents.forEach(event => {
        event._id = getRowId(event);
    });
    emsEvents.forEach(event => {
        event._id = getRowId(event);
    });

    // Inner join to get a union of events in both sheets
    let ij = innerjoin(dvdEvents, emsEvents, x => x._id);

    ij.forEach(event => {
        /* For some reason, the _id is cast to a string in innerjoin() */
        event._id = parseInt(event._id, 10);

        let {_id} = event;
        if(getIndexById(_id, emsEvents) < 0){
            // compare EMS to InnerJoin - events not in EMS sheet were cancelled
            console.log(`Missing from EMS Database : ${eventToString(event)}`);
        } else if(getIndexById(_id, dvdEvents) < 0){
            // compare David's to IJ - events not in David's were added
            console.log(`Missing from David's sheet: ${eventToString(event)}`);
        }
    });
}

module.exports = main;
