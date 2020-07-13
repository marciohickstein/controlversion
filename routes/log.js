const LOG_PATH="./log/"
const express = require('express');
const router = express.Router();

const {logRequest, getDateFormatted} = require('../utils')
const {readFile, appendFile, exists, mkdirSync} = require('fs');

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
    exists(LOG_PATH, (found) => {
        if (!found)
            mkdirSync(LOG_PATH,'0777', true);

        appendFile(file, contentData, (err) => {
            if (err) {
                response = {error: err.message};
            } else{
                response = {success: `Success: ${file} Log file write with: ${data}`};
            }
            console.log(`Send: ${JSON.stringify(response)}`);
            res.json(response);
         });
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

    file = `${LOG_PATH}${file}`;
    readFile(file, (err, data) => {
        let fileData = err ? {error: err.message} : data.toString();

        console.log(`Send: ${JSON.stringify(fileData)}`);
        return res.json(fileData);
    });
});

module.exports.routerLog = router;
