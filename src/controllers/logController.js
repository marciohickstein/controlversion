const config = require('../config');
const prependFile = require('prepend-file');
const path = require('path');
const fs = require('fs');
const { getDateFormatted } = require('../utils')

module.exports = {
	insData: (req, res) => {
		let response;
		let { file, data } = req.body;

		if (!file || !data) {
			response = { error: 'Parameter file and data are required' };
			console.log(`Send: ${JSON.stringify(response)}`);
			res.json(response);
		}

		file = `${config.app.dirLog}${file}`;
		timestamp = getDateFormatted();
		contentData = `${timestamp}: ${data}\n`;
		let buffer = Buffer.from(contentData);

		fs.exists(config.app.dirLog, (found) => {
			if (!found)
				fs.mkdirSync(config.app.dirLog, '0777', true);


			prependFile(file, contentData, (err) => {
				if (err) {
					response = { error: err.message };
				} else {
					response = { success: `Success: ${file} Log file write with: ${data}` };
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
	},
	getData: (req, res) => {
		let file = req.query.file;

		if (!file) {
			response = { error: 'Parameter file is required' };
			console.log(`Send: ${JSON.stringify(response)}`);
			return res.json(response);
		}

		filename = path.basename(file);
		file = `${config.app.dirLog}${filename}`;
		fs.readFile(file, (err, data) => {
			let fileData = err ? { error: err.message } : data.toString();

			console.log(`Send: ${JSON.stringify(fileData)}`);
			return res.json(fileData);
		});
	}
}