class User {
	constructor(id) {
		this.id = id;
		this.sqlid = null;
		this.email = null;
		this.docs = {};
		this.favorites = {};
		this.panel = null;
		this.panels = [];
		this.saved = true;
		this.colors = [];
		this.settings = {chatSound: true,chatNotification: true,uiFont: 'Source Sans Pro',lineHeight: '1.2em'};
		this.prefrences = {enableEmmet: true,showPrintMargin: false,showInvisibles: false,displayIndentGuides: true,fontSize: '18px',fontFamily: 'Inconsolata',scrollPastEnd: '.4',theme: "ace/theme/ayu-mirage",useSoftTabs: false,tabSize: 2,wrap: false};
	}
	join(path, callback,override) {
		var self = this;
		request('join', {path}, function(file) {
			if(typeof file === 'string') {notification(file);}
			else {
				new File(file,undefined,override);
				if(callback) {callback();}
			}
		});
	}
	leave(path, callback,override) {
		var self = this;
		request('leave', {path,override}, function(file) {
			if(typeof file === 'string') {notification(file);}
			else {
				if(self.docs[path]) {self.docs[path].remove();}
				if(callback) {callback();}
			}
		});
	}
	renamed(oldpath, file) {
		var doc = this.docs[oldpath];
		if(doc.panel.active === oldpath) {doc.panel.active = file.path;}
		doc.panel.files.splice(doc.panel.files.indexOf(oldpath), 1, file.path);
		new File(file, doc.panel);
		doc.remove();
		doc.panel.update();
	}
	deleted(path) {
		var doc = this.docs[path];
		var index = doc.panel.files.indexOf(path);
		doc.panel.remove(path);
		if(path === doc.panel.active) {
			findOther(doc.panel.files,index,function(n) {
				if(n === null) {doc.panel.active = null;doc.panel.update();}
				else {doc.panel.open(n);}
			});
		}
		else {doc.panel.update();}
		doc.remove();
	}
	onSave(data) {
		user.docs[data.path].saved = data.saved;
		user.docs[data.path].checkSaved();
		if(data.warning) {popup('Warning', '<div style="padding: 0 20px;">This file was saved elsewhere, merge errors may have occured, procede with caution.</div>', ['Discard Changes'], [function() {File.discard(data.path)}]);}
		if(savenclose.indexOf(data.path) > -1) {
			user.docs[data.path].panel.close(data.path);
			savenclose.splice(savenclose.indexOf(data.path), 1);
		}
	}
	onJoin(data) {
		if(data.path in user.docs) {
			user.docs[data.path].addUser(data.user);
		}
		users[data.user].docs[data.path] = data;
	}
	onLeave(data) {
		if(data.path in user.docs) {
			user.docs[data.path].removeUser(data.user);
		}
		if(data.path in users[data.user].docs) {
			delete users[data.user].docs[data.path];
		}
	}
	checkAllSaved() {
		this.saved = true;
		for(var i = 0;i<Object.keys(user.docs).length;i++) {
			if(!user.docs[Object.keys(user.docs)[i]].isSaved) {this.saved = false;break;}
		}
	}
	setName(name) {
		request('setAccount', {key: 'username', value: name}, function(data) {
			if(data !== true) {notification('Failed to set username in database');}
		});
	}
	setPassword(paths,inputs) {
		request('setPassword', {old:inputs[0].value,new:inputs[1].value}, function(data) {
			if(data) {notification('Password Reset');closePopup();}
			else {notification('Password Incorrect');}
		});
	}
	askResetPass() {
		popup('Reset Password', '<input type="password" spellcheck="false" placeholder="Old Password" onkeydown="if(event.code == \'Enter\'){this.nextElementSibling.nextElementSibling.focus();}" /><div style="height:10px;"></div><input type="password" spellcheck="false"placeholder="New Password" onkeydown="if(event.code == \'Enter\') {user.setPassword(tree.selected,[this.previousElementSibling.previousElementSibling,this])}" />', ['Reset'], [this.setPassword]);
	}
	static displayInfo(id) {
		if(users[id]) {
			var openedFiles = "";
			Object.keys(users[id].docs).length > 0 ? (Object.keys(users[id].docs).forEach(function(doc) {var b = doc.split('/').pop();openedFiles += '<div class="file" data-path="'+doc+'"><span onmouseup="tree.mouseUp(event,this);closePopup();" onmousedown="this.dataset.allowAction=true;"><img src="lib/icons/file_type_'+Tree.pickImg(doc)+'@2x.png" />' + b+'</span><dummy></dummy>'+svg.star+'</div>'})) : openedFiles = 'None Opened';
			var ltime = users[id].online ? 'Online Now' : users[id].ltime ? formatDate(users[id].ltime) : 'This user has never logged in';
			var colors = '<div style="display: flex;position: relative;align-items: center;flex-wrap: wrap;">';
			users[id].colors.forEach(function(color) {colors += `<div class="swatch small" onclick="togglePicker(true);inputColor('`+color+`')" style="background-image: linear-gradient(`+color+` 100%, `+color+` 100%), var(--transparent);"></div>`});
			if(users[id].colors.length === 0) {colors = "No Favorite Colors";}
			var favs = "";
			Object.values(users[id].favorites).length > 0 ? (Object.values(users[id].favorites).forEach(function(file) {
				if(file.ext !== 'directory') {
					favs += '<div class="file" data-rel="'+file.rel+'" data-path="'+file.path+'"><span onmouseup="tree.mouseUp(event,this);closePopup();" onmousedown="this.dataset.allowAction=true;"><img src="lib/icons/file_type_'+Tree.pickImg(file.path)+'@2x.png" />' + file.basename+'</span><dummy></dummy>'+svg.star+'</div>';
				}
				else {
					favs += '<div class="file" data-rel="'+file.rel+'" data-path="'+file.path+'"><span onmouseup="if(this.dataset.allowAction === \'true\') {tree.setRoot(\''+file.path+'\',closePopup());}" onmousedown=\"tree.mouseDown(event,this);\">'+svg.folder + file.basename+'</span><dummy></dummy>'+svg.star+'</div>';
				}
			})) : favs = "No Favorited Files";
			var uname = id === user.sqlid ? '<span style="color:var(-text);font-size:.8em;display: none;">Press Enter to Save</span><input maxlength="20" class="accountInput" spellcheck="false" value="'+users[id].username+'" onkeydown="this.previousElementSibling.style.display=\'block\';if(event.keyCode == 13) {this.blur();}" onblur="user.setName(this.value);this.previousElementSibling.style.display = \'none\';"/><br><div onclick="this.previousElementSibling.previousElementSibling.focus();this.previousElementSibling.previousElementSibling.setSelectionRange(0,this.previousElementSibling.previousElementSibling.value.length);" style="margin-left:0" class="btn">Change Name</div><div onclick="user.askResetPass();" style="margin-left:0" class="btn">Change Password</div>' : '<h2 style="margin:0">'+users[id].username+'</h2>';
			popup('Information', '<table><tr><td colspan="2">'+uname+'</td></tr><tr><td>ID</td><td>'+id+'</td></tr><tr><td>Email</td><td>'+users[id].email+'</td></tr><td>Last Seen</td><td>'+ltime+'</td></tr><tr><td>Theme</td><td style="text-transform: capitalize;"><span class="spanbtn" onclick="setTheme(\''+users[id].prefrences.theme+'\',true);">'+users[id].prefrences.theme.replace('ace/theme/', '').replace(/[_-]/g, ' ')+'</span></td></tr><tr class="nohighlight"><td>Open Documents</td><td>'+openedFiles+'</td></tr><tr class="nohighlight"><td>Favorite Colors</td><td>'+colors+'</div></td></tr><tr class="nohighlight"><td>Favorite Files</td><td>'+favs+'</td></tr></table>', null, null, true);
		}
		else {
			notification('User not found');
		}
	}
	logout() {
		request('logout', false, function(data) {
			location.reload();
		});
	}
}