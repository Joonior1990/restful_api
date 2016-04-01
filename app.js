var argv = require('minimist')(process.argv.slice(2));

var restify = require('restify');
var actionFile = require('./actionFile');

var user = {login: 'admin', pass: 'root1'};

var analogBD = './file/bd.json';
var welcome = './file/welcome.txt';

var PORT = 8888;

rest = restify.createServer({
  name: 'Server RESTfull api'
});

rest.use(restify.authorizationParser());
rest.use(restify.queryParser());
rest.use(restify.bodyParser());
rest.use(restify.gzipResponse());

rest.use(restify.CORS());

// настройка авторизации для защищенных методов
rest.use(function(req, res, next) {
  if (req.path().indexOf('/protected') !== -1) {
    var auth = req.authorization;

    if (auth.scheme == null) {
      res.header('WWW-Authenticate', 'Basic realm="Please login"');
      return res.send(401);
    } 

    if (auth.basic.username == user.login && auth.basic.password == user.pass)
    	return next();

    else 
    	return res.send(403, 'access is limited');
  }

  return next();
});

// Страница приветствия  
rest.get('/', function(req, res) {
	var data = 'Вас приветствует restfull api приложение\n';
	data += 'Перечень лучших книг, которые рекомендованы к прочтению.';

  res.send(200, data);
});

// выдаем все данные  
rest.get('/protected/', function(req, res) {
	var data = actionFile.fileRead(analogBD);
  res.send(200, data);
});

// выдаем все книги
rest.get('/protected/book/', function(req, res) {
	var data = JSON.parse( actionFile.fileRead(analogBD) );
	var allBooks = [];

	for (key in data) {
		if (key != 'genre' && typeof data[key] == 'object') {
			allBooks.push({
				'bookName' : data[key].content.name,
				'bookGenre' : data[key].genre,
			});
		}
	}
  res.send(200, allBooks);
});

// выдаем все жанры
rest.get('/protected/book/genre/', function(req, res) {
	var data = JSON.parse( actionFile.fileRead(analogBD) );
	var genre = [];

	data.genre.forEach(function(item, i) {
		genre.push({
			id : i,
			name : item, 
		})
	});
  res.send(200, genre);
});

// выдаем все книги жанра
rest.get('/protected/book/genre/:id', function(req, res, next) {
	var id = req.params.id;
	
	var data = JSON.parse( actionFile.fileRead(analogBD) );
	var genre = data.genre[id];

	if (!genre) // если жанра нет
		return res.send(404, 'genre not found');

	var genreBooks = [];
	for (key in data) {
		if (key != 'genre' && typeof data[key] == 'object') {
			if (data[key].genre == genre) {
				genreBooks.push({
					'bookID' : key,
					'bookName' : data[key].content.name,
					'bookAutor' : data[key].content.auter,
				});
			}
		}
	}
  res.send(200, genreBooks);
});

// выдаем конкретную книгу
rest.get('/protected/book/:id', function(req, res, next) {
	var id = req.params.id;
	var data = JSON.parse( actionFile.fileRead(analogBD) );

	for (key in data) {
		if (key == id && key != 'genre') {
			var currentBook = {
				'bookID' : id,
				'bookName' : data[key].content.name,
				'bookAutor' : data[key].content.autor,
				'bookDescription' : data[key].content.description,
				'bookCreateDate' : data[key].content.createDate,
			};
		}
	}

	if (currentBook) 
  	return res.send(200, currentBook);

	res.send(404, 'book not found');
});

// добавляем новый жанр
rest.post('/protected/book/genre', function(req, res) {
	if (req.params.genre) {
		var genre = req.params.genre;
		var data = JSON.parse( actionFile.fileRead(analogBD) );

		if (data) {
			var newGenre = true;
			data.genre.forEach(function(item) {
				if (item == genre)
					newGenre = false;
			});

			if (newGenre) {
				data.genre.push(genre);
				actionFile.updateFile(analogBD, JSON.stringify(data));

				res.send(200, 'add new genre: ' + req.params.genre);
			}
			else
				res.send(404, 'dublicate genre');
		}
		else 
			res.send(404, 'file not found');
	}
	else 
		res.send(404, 'not correct data. Correct data format: {"genre" : "data"}');
});

// добавляем новую книгу
rest.post('/protected/book/', function(req, res) {
	
	if (typeof req.params == 'object') {
		var name = req.params.name;
		var genre = req.params.genre;
		var autor = req.params.autor;
		var description = req.params.description;
		var createDate = req.params.createDate;

		if (name && (genre || genre === 0) && autor && createDate) {
			var data = JSON.parse( actionFile.fileRead(analogBD) );
			
			var id = data.count + 1;
			var genre = data.genre[genre] || false;

			if (genre) {
				data[id] = {
					genre : genre,
					content : {
						name : name,
						autor : autor,
						description : description,
						createDate : createDate
					}
				}

				data.count += 1;

				var result = actionFile.updateFile(analogBD, JSON.stringify(data));
				res.send(200, 'add new book this id - ' + id);
			} 
			else 
				res.send(400, 'not correct data - genere')
		}
		else 
		res.send(400, 'not correct data - content');
	}
	else 
		res.send(400, 'not correct data');
});

// Обновляем название жанров
rest.patch('/protected/book/genre/', function(req, res) {
	var id = req.params.id;
	var name = req.params.name;

	if ( (id || id === 0) && name) {

		var data = JSON.parse( actionFile.fileRead(analogBD) );

		if (data.genre[id]) {
			var currentGenre = data.genre[id];
			data.genre[id] = name;

			var result = actionFile.updateFile(analogBD, JSON.stringify(data));

			if (result)
				res.send(200, 'genre: ' +  currentGenre + ' update on ' + name );

			else 
				res.send(500, 'file not found');
		}
		else 
			res.send(404, 'genre not found')
	}
	else 
		res.send(400, 'not correct data - id OR name')
}); 

// Обновляем данные по книге
rest.patch('/protected/book/:id', function(req, res) {
	console.log(req.params.id);

	var id = req.params.id;

	var data = JSON.parse( actionFile.fileRead(analogBD) );

	var currentBookName = '';
	var check = false;
	for (key in data) {

		if (key == id && typeof data[key] == 'object' && id != 'genre') {
			currentBookName = data[key].content.name;

			for (var val in req.params) {
				if (data[key].content[val] !== false && val !== 'id') {
					check = true;
					data[key].content[val] = req.params[val];
				}
			}
		}
	}
	if (!check)
		return res.send(400, 'not correct data');

	if (currentBookName && check) {
		var result = actionFile.updateFile(analogBD, JSON.stringify(data));

		if (result)
  		return res.send(200, 'id ' + id + ', name: ' + currentBookName + ' update on data: ' + JSON.stringify(req.params) );

		res.send(500, 'file not found');
	}
	else 
		res.send(404, 'book not found');
}); 

// удаляем данные по книге
rest.del('/protected/book/:id', function(req, res) {
	var data = JSON.parse( actionFile.fileRead(analogBD) );

	var id = req.params.id;
	var check = false;
	for (var key in data) {
		if (key == id && id != 'genre' && typeof data[key] == 'object') {
			check = true;
			data[key] = '';
		}
	}

	if (!check)
		return res.send(500, 'server not delete book this id: ' + id);

	var result = actionFile.updateFile(analogBD, JSON.stringify(data));
	
	if (result)
	  res.send(200, 'book id: '+id+' delete');

	else 
		res.send(500, 'server not delete book id: '+id);
});

// удаляем все данные
rest.del('/protected/', function(req, res) {
	var result = actionFile.updateFile(analogBD, '');
	
	if (result)
	  res.send(200, 'all data delete');

	else 
		res.send(500, 'server not delete all data');
});

rest.use(function(req, res) {
	res.status(404);
});

rest.listen(PORT, function() {
  console.log('API launched on port: ', PORT);
  console.log('Приложение под REST api');
  console.log('Для уточнения api введите ключ --help');
});

if (argv.help) {
	console.log(actionFile.fileRead(welcome));
}