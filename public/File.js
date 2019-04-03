class File {
	constructor(data,panel,overridemedia,isUndefined) {
		var self = this;
		Object.assign(this,data);
		this.markers = {};
		this.isUndefined = isUndefined || false;
		this.isSaved = true;
		this.lastDelta = null;
		this.sendChanges = true;
		this.panel = panel || user.panel;
		if(this.warning) {popup('Warning', '<div style="padding: 0 20px;">This file was saved elsewhere, merge errors may have occured, procede with caution.</div>', ['Discard Changes'], [function() {File.discard(this.path)}]);}
		if(data.extname.toLowerCase() in mediaTypes && !overridemedia) {
			this.editor = new Media(this);
		}
		else if(this.isUndefined) {
			this.editor = new Editor(panel);
			this.editor.setOption('mode', 'ace/mode/text');
			this.editor.on('change', function(d) {
				self.content = self.editor.getValue();
				self.checkSaved();
			});
		}
		else {
			this.editor = new Editor(this.panel);
			this.editor.setOption('mode', modelist.getModeForPath(this.path).mode || 'ace/mode/text');
			this.editor.setValue(this.content, -1);
			this.editor.getSession().setUndoManager(new ace.UndoManager());
			this.editor.on('change', function(d) {
				if(!self.sendChanges) {self.sendChanges = true;return false;}
				self.content = self.editor.getValue();
				if(self.lastDelta !== d) {
					self.lastDelta = d;
					socket.emit('change', {path:self.path,d,content:self.content});
					self.checkSaved();
				}
			});
			this.editor.selection.on("sliceCursor", function() {
				var sel = self.editor.selection;
				var cursors = sel.ranges.length > 0 ? sel.ranges : [{start: sel.anchor,end:sel.lead}];
				socket.emit('cursor', {path:self.path,cursors});
			});
		}
		this.panel.editors.push(this.editor);
		user.docs[this.path] = this;
		this.checkSaved();
		this.updateUsers();
	}
	addUser(id) {
		if(this.users.indexOf(id) === -1) {
			this.users.push(id);
		}
		this.updateUsers();
	}
	removeUser(id) {
		var index = this.users.indexOf(id);
		if(index > -1) {
			this.users.splice(index,1);
			this.clearMarkers(users[id].id);
		}
		this.updateUsers();
	}
	updateUsers() {
		this.editor.userElem.innerHTML = '';
		if(this.users.length > 1) {
			this.editor.elem.classList.add('multiuser');
			for(var i = 0;i < this.users.length;i++) {
				var id = this.users[i];
				if(id !== user.sqlid && users[id]) {
					this.editor.userElem.innerHTML += `<div class="user"><svg style="border-color: `+users[id].color+`;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 60 60"><path d="M48.014,42.889l-9.553-4.776C37.56,37.662,37,36.756,37,35.748v-3.381c0.229-0.28,0.47-0.599,0.719-0.951c1.239-1.75,2.232-3.698,2.954-5.799C42.084,24.97,43,23.575,43,22v-4c0-0.963-0.36-1.896-1-2.625v-5.319c0.056-0.55,0.276-3.824-2.092-6.525C37.854,1.188,34.521,0,30,0s-7.854,1.188-9.908,3.53C17.724,6.231,17.944,9.506,18,10.056  v5.319c-0.64,0.729-1,1.662-1,2.625v4c0,1.217,0.553,2.352,1.497,3.109c0.916,3.627,2.833,6.36,3.503,7.237v3.309  c0,0.968-0.528,1.856-1.377,2.32l-8.921,4.866C8.801,44.424,7,47.458,7,50.762V54c0,4.746,15.045,6,23,6s23-1.254,23-6v-3.043C53,47.519,51.089,44.427,48.014,42.889z"/></svg><span onclick="User.displayInfo('`+id+`');">`+users[id].username+`</span></div>`;
				}
			}
		}
		else {
			this.editor.elem.classList.remove('multiuser');
		}
	}
	save() {
		if(this.isUndefined) {
			tree.deselect();
			tree.toggleSelect(this.path);
			popup("Save", '<input placeholder="/" value="untitled" oninput="filter(this,\'file\');" onkeydown="if(event.keyCode == 13){File.saveUnnamed(tree.selected,[this]);}" onfocus="var i = this.value.length;this.setSelectionRange(0,i);" spellcheck="false" />', ['Create'], [File.saveUnnamed]);
		}
		else {
			request('save', {path:this.path}, function(data) {
				if(data !== true) {notification(data);}
				closePopup();
			}, "bodyLoad");
		}
	}
	checkSaved() {
		var before = this.isSaved;
		this.isSaved = this.content === this.saved;
		if(before !== this.isSaved) {
			this.panel.update();
		}
		user.checkAllSaved();
	}
	applyChange(d) {
		this.lastDelta = d;
		this.editor.session.getDocument().applyDeltas([d]);
		this.content = this.editor.getValue();
		this.checkSaved();
	}
	updateCursor(data) {
		var self = this;
		this.clearMarkers(data.user);
		data.cursors.forEach(function(cursor) {
			var marker = self.editor.session.addDynamicMarker(new Cursor(cursor.end,data.color), true);
			self.markers[data.user].push(marker);
			var rng = new Range(cursor.start.row, cursor.start.column, cursor.end.row, cursor.end.column);
			if(!rng.isStart(rng.end)) {
				marker = self.editor.session.addDynamicMarker(new Selection(rng,data.color), false);
				self.markers[data.user].push(marker);
			}
		});
	}
	clearMarkers(user) {
		var self = this;
		if(user) {
			if(this.markers[user]) {
				this.markers[user].forEach(function(marker) {
					marker.remove(self.editor.session);
				});
			}
			this.markers[user] = [];
		}
		else {
			Object.keys(this.markers).forEach(function(usr) {
				self.clearMarkers(usr);
			});
		}
	}
	remove() {
		this.editor.wrap.remove();
		this.editor.destroy();
		delete user.docs[this.path];
	}
	static create(paths, inputs) {
		var dest = tree.selected.length > 0 ? tree.selected[0] : highlightFolder(mx,my,true);
		var names = inputs[0].value;
		if(names.replace(/\s/g, '') == "") {return;}
		request('create', {dest,names}, function(data) {
			if(data !== true) {notification(data);}
			closePopup();
		}, "bodyLoad");
	}
	static newUntitled() {
  	var file = new File({basename: "untitled", dirname: "", extname: "",mime: "",name: "untitled",path: "untitled"+untitledIndex,rel: "", content: "",saved:"",users: []},user.panel,true,true);
    user.panel.add('untitled'+untitledIndex);
    user.panel.active = 'untitled'+untitledIndex;
    user.docs['untitled'+untitledIndex].editor.focus();
    user.panel.update();
    file.editor.setSession(ace.createEditSession('','ace/mode/text'));
    untitledIndex ++;
	}
	static saveUnnamed(paths,inputs) {
		var dest = '/';
		var name = inputs[0].value;
		var path = paths[0];
		if(name.replace(/\s/g, '') == '') {return;}
		request('saveUntitled', {dest,name}, function(data) {
			if(data === false) {notification('Failed to create ' + name);}
			else {
				user.join(data, function() {
					user.panel = user.docs[path].panel;
					user.panel.add(data);
					user.panel.active = data;
					user.docs[data].editor.focus();
					user.docs[data].editor.setValue(user.docs[path].editor.getValue(),-1);
					user.docs[data].save();
					user.panel.close(path,true);
				});
			}
			closePopup();
		}, "bodyLoad");
	}
	static rename(paths,inputs) {
		var name = inputs[0].value;
		var path = paths[0];
		request('rename', {name,path}, function(data) {
			if(data !== true) {notification(data);}
			closePopup();
		}, "bodyLoad");
	}
	static move(paths, dest) {
		request('move', {paths,dest}, function(data) {
			if(data !== true) {
				tree.selected.forEach(function(path) {tree.elem.querySelector('[data-path="'+path+'"]').style.display = "block";});
				notification(data);
			}
			tree.deselect();
		}, "bodyLoad");
	}
	static delete(files) {
		request('delete', {files}, function(data) {
			if(data !== true) {notification(data);}
			menu.close(true);
		}, "bodyLoad");
	}
	static view(files) {
		files.forEach(function(file) {
			var rel = tree.elem.querySelector('[data-path="'+file+'"]').dataset.rel;
			if(!window.open(rel, '_blank')) {
				popup('Failed to Open file', 'Your browser blocked Slice from opening a new tab. If you want to enable this feature please allow this website to open popups.');
			}
		});
		menu.close(true);
	}
	static requestDownload(paths) {
		document.getElementById("bodyLoad").style.opacity = '1';
		document.getElementById("bodyLoad").style.zIndex = '2';
		socket.emit('download', paths);
	}
	static download(data) {
	  var elem = document.createElement('a');
	  var blob = new Blob([data.content]);
	  elem.setAttribute('href', window.URL.createObjectURL(blob));
	  elem.setAttribute('download', data.name);
	  elem.style.display = 'none';
	  document.body.appendChild(elem);
	  elem.click();
	  document.body.removeChild(elem);
		menu.close(true);
		document.getElementById("bodyLoad").style.opacity = '0';
		setTimeout(function() {document.getElementById("bodyLoad").style.zIndex = '-2';}, 500);
	}
	static upload(fd, dest) {
		if(!dest) {dest = tree.selected.length > 0 ? tree.selected[0] : highlightFolder(menu.x,menu.y,true) || tree.root;}
		fd.append('dest', dest);
		request('upload', fd, function(data) {
			if(data !== '') {
				notification(data);
			}
			menu.close(true);
		}, "bodyLoad");
	}
	static compress(paths) {
		request('compress', {paths}, function(data) {
			if(data !== true) {notification(data);}
			menu.close(true);
		}, "bodyLoad");
	}
	static extract(paths,inputs) {
		var dest = inputs ? inputs[0].value : false;
		request('extract', {paths,dest}, function(data) {
			if(data !== true) {notification(data);}
			closePopup();
		}, "bodyLoad");
	}
	static getInfo(path) {
		request('stats', {path}, function(stats) {File.displayInfo(stats);});
	}
	static displayInfo(stats) {
		var html = `
			<table>
				<tr><td tdspan="2"><h2 style="margin:0">`+stats.basename+`</h2></td></tr>
				<tr><td>File Path</td><td>`+stats.path+`</td></tr>
				<tr><td>Size</td><td>`+formatSize(stats.size)+`</td></tr>
				<tr><td>Type</td><td>`+stats.mime+`</td></tr>
				<tr><td>Last Modified</td><td>`+formatDate(stats.mtime)+`</td></tr>
		`;
		if(stats.birthtime) {html += `<tr><td>Created</td><td>`+formatDate(stats.birthtime)+`</td></tr>`;}
		html += `</table>`;
		popup('Information', html, null, null, true);
	}
	static viewFolder(paths) {
		var path = paths[0];
		menu.close(true);
		toggleFavorites();
		if(path in user.favorites) {
			tree.setRoot(user.favorites[path].dirname,false, function() {
				tree.highlight(path);
			});
		}
	}
	static editCode(paths) {
		paths.forEach(function(path) {
			if(user.docs[path]) {user.docs[path].panel.editMode(path);}
			else {user.panel.open(path,true);}
			menu.close(true);
		});
	}
	static discard(path) {
		var self = this;
		request('discard', {path}, function(data) {
			if(!data.error) {
				if(user.docs[path]) {
					user.docs[path].warning = false;
					user.docs[path].editor.setValue(data.content, -1);
					user.docs[path].content = data.content;
					user.docs[path].saved = data.content;
				}
			}
			else {
				notification(data.error);
			}
			closePopup();
		});
	}
}