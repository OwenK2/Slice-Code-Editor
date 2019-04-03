//INCLUDES
const p = require('path');
const fs = require('fs');
const bp = require('body-parser');
const ot = require('ot');
const cp = require('cookie-parser');
const mysql = require('mysql');
const AdmZip = require('adm-zip');
const fileUpload = require('express-fileupload');
const mimeType = require('mime-types');
const rimraf = require('rimraf');
const express = require('express');
const session = require('express-session');

//CONFIG
const port = process.argv[2] || 9000;
const _root = p.join(__dirname,'public');
const _editor = _root;
const _login = p.join(_editor, '/login.html');
const _trash = p.join(_editor, '/trash');
const _errors = p.join(_editor, '/errors.html');
const _host = 'localhost';
const _username = 'root';
const _password = 'root';
const _database = 'slice';
const _whitelist = [p.join(_editor,'/manifest.json'),p.join(_editor,'lib/favicon.png'),p.join(_editor,'lib/logo.png')];

//APP
const app = express();
app.use(bp.urlencoded({extended: false}));
app.use(cp());
app.use(fileUpload());
app.set('trust proxy', 1);
app.use(session({
	key: 'sid',
  secret: '11$5402^631A',
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 86400000}
}));
app.use(function(req,res,next) {
	let path = p.join(_root,req.path);
	if((!req.session.user || !req.cookies.sid) && path.indexOf(_editor) > -1) {
		if(req.method === "GET" && path !== _login && _whitelist.indexOf(path) === -1) {
			res.redirect('/'+p.relative(_root,_login));
			return;
		}
		else if(req.method === "POST" && path !== _editor+'/login') {
			res.status(403);
			return;
		}
		else {next();}
	}
	else {
		if(path === _login && (req.session.user && req.cookies.sid)) {res.redirect('/'+p.relative(_root,_editor));return;}
		else {next();}
	}
});
app.use(express.static(_root));
  
const server = require('http').createServer(app);
server.listen(port, function() {
	console.log('Listening on Port ' + port);
});

let users = {};
let sockets = {};
let files = {};
let fileStruct = {};
let blacklist = ['.DS_Store'];
let colors = ['#ED5565', '#FFCE54', '#8CC152', '#48CFAD', '#4A89DC', '#967ADC'];
let chat = [];
colors.sort(function() {return 0.5 - Math.random()});

const io = require('socket.io')(server,{pingTimeout: 60000,});

var c = mysql.createConnection({
  host: _host,
  user: _username,
  password: _password,
  database: _database
});
c.connect(function(err) {
  if (err) {console.error('Failed to Connect to Database');process.exit();}
});
c.query("SELECT sqlid,username,email,settings,prefrences,colors,favorites FROM `users`", function(error, results, fields) {
	if(error) {throw error;}
	else {
		results.forEach(function(res) {
			new User(res);
		});
	}
});

function buildStruct() {
	function dir(folder) {
		var files = fs.readdirSync(folder);
		var result = [{path:folder, name:p.basename(folder)}];
		files.forEach(function(file) {
			var path = p.join(folder,file);
			if(blacklist.indexOf(file) > -1) {return;}
			if(fs.statSync(path).isDirectory()) {result = result.concat(dir(path));}
			else {result.push({path,name:p.basename(path)});}
		});
		return result;
	}
	fileStruct = dir(_root);
	io.emit('struct', fileStruct);
}
buildStruct();


io.on('connection', function(socket) {
	console.log('Connected ' + socket.id);
	sockets[socket.id] = socket;
	socket.on('dir', function(path) {
		if(!sockets[socket.id] || !sockets[socket.id].valid) {socket.emit('reload');socket.disconnect();return;}
		let files = User.readDir(path);
		if(files) {
			socket.emit('dir', files);
		}
		else {
			socket.emit('err', "Directory does not exist");
		}
	});
	socket.on('change', function(data) {
		if(!sockets[socket.id] || !sockets[socket.id].valid) {socket.emit('reload');socket.disconnect();return;}
		if(!files[data.path]) {new File(data.path);}
		files[data.path].applyChange(data);
		socket.to(data.path).emit('change', {d:data.d,path:data.path});
	});
	socket.on('cursor', function(data) {
		if(!sockets[socket.id] || !sockets[socket.id].valid) {socket.emit('reload');socket.disconnect();return;}
		data.user = socket.id;
		data.color = sockets[socket.id].color;
		socket.to(data.path).emit('cursor', data);
	});
	socket.on('download', function(files) {
		if(!sockets[socket.id] || !sockets[socket.id].valid) {socket.emit('reload');socket.disconnect();return;}
		if(files.length > 1) {File.compress(files, false, function(content) {socket.emit('download',{name: p.basename(p.dirname(files[0])) + '.zip', content});});}
		else if(files[0].indexOf(_root) > -1 && fs.existsSync(files[0]) && fs.statSync(files[0]).isDirectory()) {File.compress(files, false, function(content) {socket.emit('download',{name: p.parse(files[0]).name + '.zip', content})});}
		else if(fs.existsSync(files[0]) && !fs.statSync(files[0]).isDirectory()) {socket.emit('download', {name: p.basename(files[0]),content:fs.readFileSync(files[0])})}
		else {socket.emit('err', "Failed to download");}
	});
	socket.on('chat', function(msg) {
		if(!sockets[socket.id] || !sockets[socket.id].valid) {socket.emit('reload');socket.disconnect();return;}
		if(msg === '/clear') {chat = [];}
		else {
			let message = {sender: sockets[socket.id].sqlid,name: sockets[socket.id].username,msg: encodeURIComponent(msg),time: new Date()};
			chat.push(message);
		}
		io.emit('chat', chat);
	});
	socket.on('disconnect', function() {
		if(socket.id in sockets) {
			if(sockets[socket.id].remove) {sockets[socket.id].remove();}
			else {delete sockets[socket.id];}
			User.updateUsers();
		}
	});
});
const _editor_rel = '/'+p.relative(_root,_editor);
console.log('REL: ' + p.join(_editor_rel,'/login'))
app.post(p.join(_editor_rel,'/connect'), function(req,res) {
	c.query('SELECT sqlid,username,email,settings,prefrences,colors,favorites FROM `users` WHERE sqlid=?', [req.session.user.sqlid], function (error, results, fields) {
		if(error) {throw error;return;}
		else if(results.length === 1) {
			var socket = sockets[req.body.id];
			if(socket) {
				sockets[req.body.id] = users[req.session.user.sqlid];
				req.session.user = Object.assign({},results[0]);
				sockets[req.body.id].updateUser(results[0]);
				sockets[req.body.id].id = socket.id;
				sockets[req.body.id].socket = socket;
				sockets[req.body.id].valid = true;
			}
			res.end(JSON.stringify(Object.assign({},req.session.user,{base: _root})));
			User.updateUsers();
			socket.emit('chat', chat);
			socket.emit('struct', fileStruct);
			socket.emit('favorites', sockets[req.body.id].getFavorites());
		}
		else {req.session.user = false;res.end('false');}
	});
});
app.post(p.join(_editor_rel,'/setAccount'), function(req,res) {
	let key = req.body.key, val = JSON.stringify(req.body.value);
	let data = users[req.session.user.sqlid].setAccount(key,val);
	if(data) {res.end('true');}
	else {res.end(data);}
});
app.post(p.join(_editor_rel,'/setPassword'), function(req,res) {
	let oldPass = req.body.old;
	let newPass = req.body.new;
	c.query("UPDATE `users` SET Password=PASSWORD(?) WHERE sqlid=? AND Password=PASSWORD(?)", [newPass,req.session.user.sqlid,oldPass], function(error, results,fields) {
		if(error) {throw error;res.end('false');}
		else if(results.affectedRows === 1) {
			res.end('true');
		}
		else {
			res.end('false');
		}
	});
});
app.post(p.join(_editor_rel,'/dir'), function(req,res) {
	let files = User.readDir(req.body.path);
	if(files) {
		res.end(JSON.stringify(files));
	}
	else {
		res.end("Directory does not exist");
	}
});
app.post(p.join(_editor_rel,'/join'), function(req,res) {
	let path = p.resolve(_root, p.normalize(req.body.path));
	let user = users[req.session.user.sqlid];
	if(user.socket) {
		user.join(path);
		res.end(JSON.stringify(files[path]));
	}
	else {res.end('Failed to Join ' + p.basename(path));}
});
app.post(p.join(_editor_rel,'/leave'), function(req,res) {
	let path = p.resolve(_root, p.normalize(req.body.path));
	let override = req.body.override === 'true';
	let user = users[req.session.user.sqlid];
	if(user.socket) {
		user.leave(path, override);
		res.end(JSON.stringify({path}));
	}
	else {res.end('Failed to Leave ' + p.basename(path));}
});
app.post(p.join(_editor_rel,'/save'), function(req,res) {
	path = p.resolve(_root, p.normalize(req.body.path));
	if(path in files) {
		files[path].save();
		res.end('true');
	}
	else {
		res.end("Failed to save, file not found");
	}
});
app.post(p.join(_editor_rel,'/create'), function(req,res) {
	let dest;
	if(fs.existsSync(req.body.dest)) {
		if(fs.statSync(req.body.dest).isDirectory()) {dest = p.resolve(_root, p.normalize(req.body.dest));}
		else {dest = p.resolve(_root, p.dirname(req.body.dest));}
	}
	else {dest = _root;}
	if(dest.indexOf(_root) === -1) {dest = _root;}
	let names = req.body.names.replace(/ /g, '').split(',');
	let data = File.create(names,dest);
	if(data === true) {res.end('true');}
	else {res.end(data);}
});
app.post(p.join(_editor_rel,'/saveUntitled'), function(req, res) {
	let dest;
	if(fs.existsSync(req.body.dest)) {
		if(fs.statSync(req.body.dest).isDirectory()) {dest = p.resolve(_root, p.normalize(req.body.dest));}
		else {dest = p.resolve(_root, p.dirname(req.body.dest));}
	}
	else {dest = _root;}
	if(dest.indexOf(_root) === -1) {dest = _root;}
	let name = req.body.name.replace(/ /g, '');
	let path = File.fixNaming(p.join(dest,name));
	let data = File.create([name],dest);
	if(data === true) {res.end(path);}
	else {res.end('false');}
});
app.post(p.join(_editor_rel,'/delete'), function(req,res) {
	let data = File.delete(JSON.parse(req.body.files));
	if(data === true) {res.end('true');}
	else {res.end(data);}
});
app.post(p.join(_editor_rel,'/rename'), function(req,res) {
	let np = p.join(p.dirname(req.body.path), req.body.name);
	if(np === req.body.path) {res.end('true');return;}
	let data = File.rename(req.body.path, np);
	if(data === true) {res.end('true');}
	else {res.end(data);}
});
app.post(p.join(_editor_rel,'/move'), function(req,res) {
	let paths = JSON.parse(req.body.paths);
	let data = File.move(paths,req.body.dest);
	if(data === true) {res.end('true');}
	else {res.end(data);}
});
app.post(p.join(_editor_rel,'/compress'), function(req,res) {
	let files = JSON.parse(req.body.paths);
	let dest = p.dirname(files[0]);
	if(dest.indexOf(_root) === -1) {dest = _root;}
	let name = files.length === 1 ? p.parse(files[0]).name : p.parse(dest).name;
	dest = p.join(dest, name + '.zip');
	let data = File.compress(files,dest);
	if(data === true) {res.end('true');}
	else {res.end(data);}
});
app.post(p.join(_editor_rel,'/extract'), function(req,res) {
	let files = JSON.parse(req.body.paths);
	let dest = p.resolve(_root, p.normalize(req.body.dest));
	let data = req.body.dest !== "false" ? File.extract(files,dest) : File.extract(files);
	if(data === true) {res.end('true');}
	else {res.end(data);}
});
app.post(p.join(_editor_rel,'/upload'), function(req,res) {
	let dest;
  if(!req.files || Object.keys(req.files).length == 0) {
    res.end();
    return;
  }
	let files = req.files.upload;
	if(fs.existsSync(req.body.dest)) {
		if(fs.statSync(req.body.dest).isDirectory()) {dest = p.resolve(_root, p.normalize(req.body.dest));}
		else {dest = p.resolve(_root, p.dirname(req.body.dest));}
	}
	else {res.end('Destination does not exist'); return;}
	if(dest.indexOf(_root) === -1) {res.end('Not allowed to access folder before root'); return;}
	if(!Array.isArray(files)) {files = [files];}
	File.upload(files, dest, function(err) {
		if(err) {res.end(err);}
		else {res.end();}
	});
});
app.post(p.join(_editor_rel,'/discard'), function(req,res) {
	let path = p.resolve(_root, p.normalize(req.body.path));
	if(path in files) {
		if(files[path].discard()) {
			res.end(JSON.stringify({error:false,content:files[path].content}));
		}
		res.end(JSON.stringify({error:'Failed to discard changes',content:''}));
	}
	else {
		res.end(JSON.stringify({error:'File not found',content:''}));
	}
});
app.post(p.join(_editor_rel,'/stats'), function(req,res) {
	let path = p.resolve(_root, p.normalize(req.body.path));
	let data = fs.statSync(path);
	let mime = data.isDirectory() ? 'directory' : mimeType.lookup(path) || 'unknown';
	let stats = {path,basename:p.basename(path),mime};
	stats = Object.assign(stats,data);
	res.end(JSON.stringify(stats));
});
app.post(p.join(_editor_rel,'/login'), function(req,res) {
	c.query('SELECT sqlid,username,email,settings,prefrences,colors,favorites FROM `users` WHERE (email=? OR username=?) AND password=PASSWORD(?)', [req.body.username,req.body.username,req.body.password], function (error, results, fields) {
		if(error) {res.end(error);}
		else if(results.length === 1) {
			if(users[results[0].sqlid] && users[results[0].sqlid].valid) {res.end('invalid');return;}
			req.session.user = Object.assign({},results[0]);
			if(!users[req.session.user.sqlid]) {new User(req.req.session.user.sqlid);}
			users[req.session.user.sqlid].ltime = new Date();
			console.log('User #'+req.session.user.sqlid + ' logged in');
			res.end('true');
		}
		else {req.session.user = false;res.end('false');}
	});
});
app.post(p.join(_editor_rel,'/logout'), function(req,res) {
	let id = req.session.user.sqlid;
	res.clearCookie('user_sid');
	req.session.destroy(function() {
		users[id].valid = false;
		res.end('true');
	});
});

class User {
	constructor(res) {
		this.updateUser(res);
		this.id = null;
		this.favorites = [];
		this.socket = null;
		this.docs = [];
		this.valid = false;
		users[this.sqlid] = this;
	}
	join(path) {
		if(!files[path]) {new File(path);}
		files[path].addUser(this.sqlid);
		this.socket.join(path);
		this.docs.push(path);
		io.emit('user_joined', {path,user:this.sqlid});
	}
	leave(path, override) {
		if(path in files) {
			files[path].removeUser(this.sqlid,override);
		}
		this.socket.leave(path);
		this.docs.splice(this.docs.indexOf(path), 1);
		io.emit('user_left', {path,user:this.sqlid});
	}
	updateUser(res) {
		var self = this;
		Object.keys(res).forEach(function(key) {
    	var val = res[key];
      while(typeof val === 'string' && JSON.valid(val)) {val = JSON.parse(val);}
      self[key] = val;
    });
	}
	setAccount(key,value) {
		let self = this;
		let val = value || this[key];
		if(key === 'username' && val.length > 20) {val = val.substring(0,20);}
		if(typeof val !== "string") {val = JSON.stringify(val);}
		function onFinish(error, results, fields) {
			if(error || results.affectedRows !== 1) {throw error;}
			else {
				if(value) {
	        while(typeof val === 'string' && JSON.valid(val)) {val = JSON.parse(val);}
					self[key] = val;
				}
				if(key === 'prefrences' || key === 'username' || key === 'colors' || key === 'favorites') {User.updateUsers();}
				if(key === 'favorites' && self.socket) {self.socket.emit('favorites', self.getFavorites())}
				return true;
			}
		}
		if(key === 'username') {c.query('UPDATE `users` SET username=? WHERE sqlid=?', [val,this.sqlid], onFinish);}
		else if(key === 'settings') {c.query('UPDATE `users` SET settings=? WHERE sqlid=?', [val,this.sqlid], onFinish);}
		else if(key === 'prefrences') {c.query('UPDATE `users` SET prefrences=? WHERE sqlid=?', [val,this.sqlid], onFinish);}
		else if(key === 'colors') {c.query('UPDATE `users` SET colors=? WHERE sqlid=?', [val,this.sqlid], onFinish);}
		else if(key === 'favorites') {c.query('UPDATE `users` SET favorites=? WHERE sqlid=?', [val,this.sqlid], onFinish);}	
		return true;
	}
	getFavorites() {
		let result = {};
		let self = this;
		this.favorites.forEach(function(fav) {
			if(!fs.existsSync(fav)) {self.favorites.splice(self.favorites.indexOf(fav), 1);return;}
			let basename = p.basename(fav);
			let rel = '/'+p.relative(_root,fav);
			let dirname = p.dirname(fav);
			let ext = fs.statSync(fav).isDirectory() ? 'directory' : p.extname(fav);
			let si = ext === 'directory' ? '0' + basename : '1' + ext + basename;
			result[si] = {path:fav,basename,ext,rel,dirname};
		});
		let favorites = {};
		Object.keys(result).sort().forEach(function(key) {favorites[result[key].path] = result[key];});
		return favorites;
	}
	remove() {
		for(var i = this.docs.length;i >=0;i--) {
			if(this.docs[i] in files) {
				this.leave(this.docs[i]);
			}
		}
		if(this.socket) {delete sockets[this.id];}
		this.valid = false;
		this.ltime = new Date();
		User.updateUsers();
	}
	static readDir(dir) {
		if(dir.indexOf(_root) === -1) {dir = _root;}
		if(fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
			let files = fs.readdirSync(dir), result = {};
			files.forEach(function(file, i) {
				if(blacklist.indexOf(file) === -1) {
					let path = p.normalize(p.join(dir,file));
					let basename = p.basename(path);
					let rel = '/'+p.relative(_root,path);
					let ext = fs.statSync(path).isDirectory() ? 'directory' : p.extname(path);
					let si = ext === 'directory' ? '0' + basename : '1' + ext + basename;
					result[si] = {path,basename,ext,rel};
				}
			});
			let sorted = {};
			Object.keys(result).sort().forEach(function(key) {sorted[key] = result[key];});
			var dirname = p.dirname(dir).indexOf(_root) > -1 ? p.dirname(dir) : false;
			return {path: dir,basename: p.basename(dir),dirname,files:Object.values(sorted),rel:'/'+p.relative(_root,dir)};
		}
		else {
			return false;
		}
	}
	static dirContents(dir) {
		if(dir.indexOf(_root) === -1) {return false}
		if(fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
			let files = fs.readdirSync(dir), result = [];
			files.forEach(function(file) {
				if(blacklist.indexOf(file) === -1) {
					result.push(p.normalize(p.join(dir,file)));
				}
			});
			return result;
		}
		else {return false;}
	}
	static updateUsers() {
		var userData = {};
		Object.keys(users).forEach(function(id,index) {
			var favorites = users[id].getFavorites();
			var docs = {};users[id].docs.forEach(function(doc) {docs[doc] = doc;});
			if(users[id].socket) {users[id].color = colors[Object.keys(sockets).indexOf(users[id].id) % colors.length];}
			userData[users[id].sqlid] = {
				sqlid: users[id].sqlid,
				username: users[id].username,
				email: users[id].email,
				settings: users[id].settings,
				prefrences: users[id].prefrences,
				colors: users[id].colors,
				favorites,
				color: users[id].color,
				docs,
				ltime: users[id].ltime,
				online: users[id].valid
			};
		});
		io.emit('users', userData);
	}
}
class File {
	constructor(path) {
		this.path = path;
		this.content = fs.readFileSync(path).toString();
		this.saved = this.content;
		this.users = []; //array of user ids
		this.getStats();
		files[this.path] = this;
	}
	getStats() {
		this.name = p.parse(this.path).name;
		this.basename = p.basename(this.path);
		this.extname = p.extname(this.path);
		this.dirname = p.dirname(this.path);
		this.rel = '/'+p.relative(_root,this.path);
		this.stats = fs.statSync(this.path);
		this.mime = mimeType.lookup(this.path);
	}
	applyChange(data) {
		this.content = data.content;
	}
	fetch() {
		this.saved = fs.readFileSync(this.path).toString();
		return this.saved;
	}
	save() {
		actionStack.push('update'+this.path);
		fs.writeFileSync(this.path,this.content);
		this.saved = this.content;
		this.warning = false;
		io.in(this.path).emit('saved', {path:this.path, saved:this.saved});
	}
	discard() {
		this.content = this.fetch();
		this.warning = false;
		return true;
	}
	addUser(id) {
		if(this.users.indexOf(id) === -1) {
			this.users.push(id);
		}
	}
	removeUser(id, canDelete) {
		this.users.splice(this.users.indexOf(id), 1);
		if(canDelete && this.users.length === 0) {
			this.remove();
		}
	}
	remove() {
		for(let i = this.users.length-1;i > -1;i--) {
			users[this.users[i]].leave(this.path);
		};
		delete files[this.path];
	}
	static create(names,dest) {
		var err = "";
		if(dest.indexOf(_root) === -1) {return 'Forbidden to access a a folder before root';}
		names.forEach(function(name) {
			if(name.replace(/ /g, '') === "") {err += "One of the names you entered is empty";return;}
			let path = File.fixNaming(p.join(dest, name));
			if(!fs.existsSync(p.dirname(path))) {err += "Couldnt Create " + p.basename(name) + " destination does not exist";return;}
			if(p.dirname(path).indexOf(_root) === -1) {err += 'Couldnt Create ' + p.basename(name) + ", because you are forbidden to access a a folder before root";return;}
			actionStack.push('create'+path);
			if(p.extname(path)) {
				fs.openSync(path, 'w');
			}
			else {
				fs.mkdirSync(path);
			}
		});
		updateDir(dest);
		if(err !== "") {return err;}
		else {return true;}
	}
	static delete(paths) {
		var err = "";
		console.log(paths.join('\n'))
		paths.forEach(function(path) {
			if(path.indexOf(_root) === -1) {err += 'Forbidden to access a folder before root';return;}
			if(fs.existsSync(path)) {
				if(path.indexOf(_trash) > -1) {
					actionStack.push('delete'+path);
					if(fs.statSync(path).isDirectory()) {rimraf.sync(path);}
					else {fs.unlinkSync(path);}
				}
				else {
					File.rename(path, p.join(_trash,p.basename(path)), true);
				}
			}
			else {
				err += "The file " + p.basename(path) + " does not exist";
			}
		});
		onDelete(paths);
		if(err !== "") {return err;}
		else {return true;}
	}
	static rename(path,newpath,del) {
		if(path.indexOf(_root) === -1 || newpath.indexOf(_root) === -1) {return 'Forbidden to access a folder before root';}
		if(fs.existsSync(path)) {
			actionStack.push('rename'+path);
			newpath = File.fixNaming(newpath);
			fs.renameSync(path,newpath);
		}
		else {return "The file "+p.basename(path)+" does not exist";}
		if(newpath.indexOf(_trash) === -1) {onRename(path,newpath);}
		else if(!del) {onDelete([path]);}
		return true;
	}
	static fixNaming(path) {
		let data = p.parse(path), atp = 1;
		while(fs.existsSync(path) && atp < 100) {
			data.name = data.name.replace(/\([0-9]+\)$/gi, '');
			path = p.join(data.dir, data.name + '(' + atp + ')' + data.ext);
			atp ++;
		}
		return path;
	}
	static move(paths,dest) {
		var err = "";
		if(!fs.existsSync(dest)) {return "Destination does not exist"}
		if(dest.indexOf(_root) === -1) {return "Forbidden to access a folder before root";}
		let sources = [];
		paths.forEach(function(path) {
			if(path === dest) {return;}
			else if(fs.existsSync(path)) {
				let np = p.join(dest,p.basename(path));
				if(np === path) {return;}
				np = File.fixNaming(np);
				if(sources.indexOf(p.dirname(path))) {sources.push(p.dirname(path));}
				actionStack.push('rename'+path);
				fs.renameSync(path,np);
				onMoveMid(path,np);
			}
			else {err += "The file "+p.basename(path)+" does not exist";return;}
		});
		onMoveEnd(sources,dest);
		if(err !== "") {return err;}
		else {return true;}
	}
	static compress(paths,dest,callback) {
		var err = "";
		let zip = new AdmZip();
		if(paths.length == 1 && fs.existsSync(paths[0]) && fs.statSync(paths[0]).isDirectory()) {
			paths = User.dirContents(paths[0]);
		}
		paths.forEach(function(path) {
			if(path.indexOf(_root) > -1 && fs.existsSync(path)) {
				if(fs.statSync(path).isDirectory()) {zip.addLocalFolder(path, p.basename(path));}
				else {zip.addLocalFile(path);}
			}
			else {err += "File does not exist";return;}
		});
		if(dest) {actionStack.push('create'+dest);zip.writeZip(dest);updateDir(p.dirname(dest));return true;}
		else {zip.toBuffer(function(content) {
			if(callback) {callback(content);}
			return content;
		},function() {return false;});}
	}
	static extract(files, dest) {
		var err = "";
		if(dest && !fs.existsSync(p.dirname(dest))) {return "Destination does not exist"}
		if(dest && dest.indexOf(_root) === -1) {return "Forbidden to access a folder before root";}
		files.forEach(function(path) {
			if(p.extname(path) !== '.zip') {err += 'Could not extract ' + p.basename(path) + ' because it is not a zip file';return;}
			var zip = new AdmZip(path);
			var folder = dest || p.join(p.dirname(path), p.parse(path).name);
			var target = File.fixNaming(folder);
			if(!fs.existsSync(p.dirname(target))) {err += 'Could not extract ' + p.basename(path) + ' because its destination does not exist';return;}
			if(p.dirname(target).indexOf(_root) === -1) {err += 'Could not extract ' + p.basename(path) + ' because you are forbidden to access a a folder before root';return;}
			actionStack.push('create'+target);
			zip.extractAllTo(target);
		});
		updateDir(files,true);
		if(err !== "") {return err;}
		else {return true;}
	}
	static upload(files,dest,callback) {
		var err = "";
		files.forEach(function(file) {
			let path = File.fixNaming(p.join(dest,file.name));
			actionStack.push('create'+path);
			file.mv(path, function(e) {
				if(e) {err += 'Error Uploading ' + file.name;}
				else {fs.writeFileSync(path,file.data);updateDir(dest);}
			});
		});
		if(err !== "") {if(callback) {callback(err);}return false;}
		else {if(callback) {callback();}return true;}
	}
}

function onRename(path, newpath) {
	if(newpath.indexOf(_trash) > -1) {onDelete([path]);return;}
	var found = false;
	updateDir(path,true);
	if(p.dirname(path) !== p.dirname(newpath)) {updateDir(newpath,true);}
	if(path in files) {
		new File(newpath);
		files[newpath].content = files[path].content;
		files[path].users.forEach(function(id) {
			if(users[id]) {
				if(users[id].socket) {
					users[id].join(newpath);
				}
			}
		});
		Object.keys(files).forEach(function(file) {
			if(file.indexOf(path) > -1) {
				onRename(file, file.replace(path, newpath));
			}
		});
		io.to(path).emit('renamed', {oldpath:path,file:files[newpath]});
		files[path].remove();
	}
	Object.keys(users).forEach(function(id) {
		var index = users[id].favorites.indexOf(path);
		if(index > -1) {
			found = true;
			users[id].favorites[index] = newpath;
			users[id].setAccount('favorites');
		}
	});
	if(found) {User.updateUsers();}
	buildStruct();
}
function onMoveMid(path,newpath) {
	var found = false;
	if(path in files) {
		new File(newpath);
		files[newpath].content = files[path].content;
		files[path].users.forEach(function(id) {
			if(users[id] && users[id].socket) {
				users[id].join(newpath);
			}
		});
		io.to(path).emit('renamed', {oldpath:path,file:files[newpath]});
		files[path].remove();
	}
	Object.keys(files).forEach(function(file) {
		if(file.indexOf(path) > -1) {
			onMoveMid(file, file.replace(path, newpath));
		}
	});
	Object.keys(users).forEach(function(id) {
		var index = users[id].favorites.indexOf(path);
		if(index > -1) {
			found = true;
			users[id].favorites[index] = newpath;
			users[id].setAccount('favorites');
		}
	});
	if(found) {User.updateUsers();}
}
function onMoveEnd(sources, dest) {
	updateDir(sources);
	if(sources.indexOf(dest) === -1) {
		updateDir(dest);
	}
	buildStruct();
}
function onDelete(paths) {
	var found = false;
	updateDir(paths,true);
	paths.forEach(function(path) {
		if(path in files) {
			io.to(path).emit('deleted', path);
			files[path].remove();
		}
		Object.keys(files).forEach(function(file) {
			if(file.indexOf(path) > -1) {
				onDelete([file]);
			}
		});
		Object.keys(users).forEach(function(id) {
			var index = users[id].favorites.indexOf(path);
			if(index > -1) {
				found = true;
				users[id].favorites.splice(index, 1);
				users[id].setAccount('favorites');
			}
		});
	});
	if(found) {User.updateUsers();}
	buildStruct();
}
function updateDir(dirs,isFile) {
	if(!Array.isArray(dirs)) {dirs = [dirs];}
	let updated = [];
	dirs.forEach(function(path) {
		if(isFile) {path = p.dirname(path);}
		if(updated.indexOf(path) === -1) {
			let files = User.readDir(path);
			io.emit('dir', files);
			updated.push(path);
		}
	});
}
const watchr = require('watchr');
let pending = {};
let actionStack = [];
function listener (evt, path, cstat, pstat) {
	if(evt === 'create') {
		if(cstat.ino in pending) {
			clearTimeout(pending[cstat.ino].tmout);
			let oldpath = pending[cstat.ino].path;
			delete pending[cstat.ino];
			let actionIndex = actionStack.indexOf('rename'+oldpath);
			if(actionIndex > -1) {actionStack.splice(actionIndex,1); return;}
			onRename(oldpath,path);
		}
		else {
			let actionIndex = actionStack.indexOf('create'+path);
			if(actionIndex > -1) {actionStack.splice(actionIndex,1);return;}
			updateDir(path,true);
		}
	}
	else if(evt === 'delete') {
		pending[pstat.ino] = {path, tmout: setTimeout(function() {
			delete pending[pstat.ino];
			let actionIndex = actionStack.indexOf('delete'+path);
			if(actionIndex > -1) {actionStack.splice(actionIndex,1); return;}
			onDelete([path]);
		}, 1000)};
	}
	else if(evt === 'update') {
		let actionIndex = actionStack.indexOf('update'+path);
		if(actionIndex > -1) {actionStack.splice(actionIndex,1); return;}
		if(path in files) {
			if(files[path].users.length === 0 && files[path].content === files[path].saved) {
				let saved = files[path].fetch();
				files[path].content = files[path].saved;
			}
			else {
				let saved = files[path].fetch();
				files[path].warning = files[path].saved !== files[path].content;
				io.in(path).emit('saved', {path, saved,warning:files[path].warning});
			}
		}
	}
}
let stalker = watchr.open(_root, listener, function(err) {if(err) {throw err;}});
stalker.setConfig({
  stat: false,
  interval: 5007,
  persistent: true,
  catchupDelay: 2000,
  preferredMethods: ['watch', 'watchFile'],
  followLinks: true,
  ignorePaths: false,
  ignoreHiddenFiles: false,
  ignoreCommonPatterns: true,
  ignoreCustomPatterns: null
});

JSON.valid = function(text) {
	try {JSON.parse(text);}
	catch(e) {return false;}
	return true;
}