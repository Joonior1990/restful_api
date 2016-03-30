var fs = require('fs');
var option = 'utf-8';

module.exports = {
	fileRead : function (filename) {	
		// при асинхронном не успеваем прочесть файл
		var data = fs.readFileSync(filename, option);

		// файл не найден 
		if (data === false)
			return false;

		else 
			return data;
	},
	
	updateFile : function(filename, data) {
		var result = fs.writeFileSync(filename, data);

		if (result === false)
			return false;

		else 
			return true;
	}
}