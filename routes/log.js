const LOG_PATH="./log/"
const express = require('express');
const router = express.Router();
const prependFile = require('prepend-file');
const path = require('path');

const {logRequest, getDateFormatted} = require('../utils')
const fs = require('fs');

// INSERT data in file log
router.post("/", logRequest, (req, res) => {
    let response;
    let {file, data} = req.body;

    if (!file || !data)
    {
        response = {error: 'Parameter file and data are required'};
        console.log(`Send: ${JSON.stringify(response)}`);
        res.json(response);
    }

    file = `${LOG_PATH}${file}`;
    timestamp = getDateFormatted();
    contentData = `${timestamp}: ${data}\n`;
    let buffer = Buffer.from(contentData);

    fs.exists(LOG_PATH, (found) => {
        if (!found)
            fs.mkdirSync(LOG_PATH,'0777', true);

            
        prependFile(file, contentData, (err) => {
            if (err) {
                response = {error: err.message};
            } else{
                response = {success: `Success: ${file} Log file write with: ${data}`};
            }
            console.log(`Send: ${JSON.stringify(response)}`);
            res.json(response);
         });
        // appendFile(file, contentData, (err) => {
        //     if (err) {
        //         response = {error: err.message};
        //     } else{
        //         response = {success: `Success: ${file} Log file write with: ${data}`};
        //     }
        //     console.log(`Send: ${JSON.stringify(response)}`);
        //     res.json(response);
        //  });
    });
})
    
// GET all log file content
router.get("/", logRequest, (req, res) => {
    let file = req.query.file;

    if (!file)
    {
        response = {error: 'Parameter file is required'};
        console.log(`Send: ${JSON.stringify(response)}`);
        return res.json(response);
    }

    filename = path.basename(file);
    file = `${LOG_PATH}${filename}`;
    fs.readFile(file, (err, data) => {
        let fileData = err ? {error: err.message} : data.toString();

        console.log(`Send: ${JSON.stringify(fileData)}`);
        return res.json(fileData);
    });
});

module.exports.routerLog = router;
