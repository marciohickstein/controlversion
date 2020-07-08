const express = require('express');
const router = express.Router();
const {logRequest} = require('../utils')
const {spawn} = require('child_process');

// EXEC process on server
router.post("/", logRequest, (req, res) => {
    let respose;
    let execCmd = true;
    const {cmd, params} = req.body;

    if (!cmd){
        execCmd = false;
        response = {error: "Command parameter is required"}
        console.log(`Send: ${JSON.stringify(response)}`);
        res.json(response);
    }

    if (params && !Array.isArray(params)){
        execCmd = false;
        response = {error: "Params have to be an array"}
        console.log(`Send: ${JSON.stringify(response)}`);
        res.json(response);
    }

    if (execCmd){
        let stdout = "", stderr = "";
        const command = spawn(cmd, params ? params : []);
    
        command.stdout.on('data', (data) => {
            stdout = data.toString();
        })
        
        command.stderr.on('data', (data) => {
            stderr = data.toString();
        })
        
        command.on('error', (error) => {
           console.log(`Error: ${error.message}`);
        })
        
        command.on('close', (code) => {
            console.log('Child process exited with exit code '+code);
            response = {
                            code: code,
                            stdout: stdout,
                            stderr: code === -2 ? 'Command not found' : stderr 
                       }
            console.log(`Send: ${JSON.stringify(response)}`);
            res.json(response);
         });
    }
})

module.exports.routerExec = router;