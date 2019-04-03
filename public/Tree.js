class Tree {
	constructor(root, opened) {
		this.elem = document.getElementById('files');
		this.folders = {};
		this.opened = opened || [];
		this.selected = [];
		this.tree = {};
		this.struct = [];
		this.searchable = [];
		this.base = null;
		this.root = root || '/';
		this.scrollSpd = 1;
		this.highlights = {};
		this.rIndex = 0;
		this.results = [];
		this.setRoot(this.root,true);
	}
	setRoot(root,noclear,callback) {
		var self = this;
		request('dir', {path:root}, function(res) {
			self.elem.innerHTML = '';
			self.tree = {};
			self.folders = {};
			self.selected = [];
			self.back = res.dirname;
			if(!noclear) {self.opened = [];}
			if(self.opened.indexOf(res.path) === -1) {self.opened.push(res.path);}
			self.folders[res.path] = res.files;
			self.tree[res.path] = [];
			res.files.forEach(function(file) {self.tree[res.path].push(file.path);});
			self.root = res.path;
			if(self.back) {self.elem.innerHTML += '<div class="back"><span onclick="tree.setRoot(\''+self.back+'\',true)">'+svg.folder+self.back.split('/').pop()+'</span>'+svg.arrow+'</div>';}
			self.addDirectory(res,self.elem);
			if(noclear && !(self.opened.length === 1 && self.opened[0] === res.path)) {self.openAll();}
			setCookie('root', res.path);
			setCookie('opened', JSON.stringify(self.opened));
			self.searchable = self.struct.filter(file => file.path.indexOf(self.root) > -1);
			if(callback) {callback();}
		});
	}
	getFiles(path,callback) {
		var self = this;
		this.addLoader(path);
		request('dir', {path}, function(data) {
			if(typeof data !== 'object') {
				var index = self.opened.indexOf(path);
				if(index > -1) {self.opened.splice(index,1);}
				setCookie('opened', JSON.stringify(self.opened));
			}
			else {
				self.setFiles(data);
			}
			if(callback) {callback(data);}
		});
	}
	setFiles(dir) {
		if(typeof dir !== 'object') {
			return;
		}
		var self = this;
		this.folders[dir.path] = dir.files;
		this.tree[dir.path] = [];
		dir.files.forEach(function(file) {self.tree[dir.path].push(file.path);});
		this.loadFolder(dir.path);
		this.removeLoader(dir.path);
	}
	openTo(file, callback) {
		var self = this;
		function open(dir) {
			if(self.opened.indexOf(dir.path) === -1) {
				self.opened.push(dir.path);
				var elem = self.elem.querySelector('[data-path="'+dir.path+'"]');
				if(elem) {elem.classList.add('open', 'tmp');}
			}
			i++;
			if(i <= path.length) {load();}
			else if(callback) {callback();}
		}
		function load() {
			var folder = path.slice(0,i).join('/');
			if(!self.folders[folder]) {self.getFiles(folder, open);}
			else {open({path:folder})}
		}
		var i = this.root.split('/').length;
		var path = file.split('/');path.pop();
		if(file === this.base) {path = this.base.split('/');}
		if(path.length < i) {this.setRoot(path.join('/'), true,function() {load();})}
		else {load();}
	}
	openAll() {
		var self = this;
		var i = 0;
		this.elem.querySelectorAll('.open').forEach(function(elem) {elem.classList.remove('open');});
		function open(dir) {
			var elem = self.elem.querySelector('[data-path="'+dir.path+'"]');
			if(elem) {
				elem.classList.add('open');
			}
			i++;
			if(i < self.opened.length) {load(self.opened[i]);}
		}
		function load(path) {
			if(!self.folders[path]) {self.getFiles(path, open);}
			else {open({path});}
		}
		load(this.opened[i]);
	}
	loadFolder(dir) {
		var self = this;
		var folder = this.elem.querySelector('[data-path="'+dir+'"]');
		if(folder) {
			folder = folder.nextElementSibling;
			folder.innerHTML = "";
			if(this.folders[dir].length == 0) {
				folder.innerHTML = '<div class="empty">*empty*</div>';
			}
			else {
				this.folders[dir].forEach(function(file) {
					if(file.ext === 'directory') {
						self.addDirectory(file, folder);
					}
					else {self.addFile(file, folder);}
				});
			}
		}
	}
	addDirectory(file,folder) {
		var self = this;
		var elem = document.createElement('div');
		elem.className = this.folders[file.path] && this.opened.indexOf(file.path) > -1 ? 'file dir open' : 'file dir';
		if(file.path in user.favorites) {elem.className += " favorite";}
		elem.dataset.path = file.path;
		elem.dataset.rel = file.rel;
		elem.innerHTML = svg.arrow+'<span onmouseup="tree.mouseUp(event,this);" onmousedown="tree.mouseDown(event,this);">'+svg.folder + '<span>' + file.basename+'</span></span><dummy></dummy>'+svg.star;
		elem.children[1].addEventListener('move', function(e) {self.onMove(e,this);});
		elem.children[1].addEventListener('release', function(e) {self.onRelease(e,this)});
		folder.appendChild(elem);
		var f = document.createElement('div');
		f.className = 'folder'; 
		folder.appendChild(f);
		if(this.folders[file.path]) {
			this.loadFolder(file.path,folder);
		}
	}
	addFile(file,folder) {
		var self = this;
		var elem = document.createElement('div');
		elem.className = file.path in user.favorites ? 'file favorite' : 'file';
		elem.dataset.path = file.path;
		elem.dataset.rel = file.rel;
		elem.innerHTML = '<span onmouseup="tree.mouseUp(event,this);" onmousedown="tree.mouseDown(event,this);"><img src="lib/icons/file_type_'+Tree.pickImg(file.path)+'@2x.png" /><span>' + file.basename+'</span></span><dummy></dummy>'+svg.star;
		elem.firstElementChild.addEventListener('move', function(e) {self.onMove(e,this);});
		elem.firstElementChild.addEventListener('release', function(e) {self.onRelease(e,this)});
		folder.appendChild(elem);
	}
	toggleFolder(elem) {
		elem.classList.toggle('open');
		if(!this.folders[elem.dataset.path]) {this.getFiles(elem.dataset.path);}
		if(elem.classList.contains('open') && this.opened.indexOf(elem.dataset.path) === -1) {
			this.opened.push(elem.dataset.path);
		}
		else {
			this.opened.splice(this.opened.indexOf(elem.dataset.path), 1);
		}
		setCookie('opened', JSON.stringify(this.opened));
	}
	mouseDown(e,el) {
		var self = this;
		var elem = el.classList.contains('tab') ? el : el.parentNode;
		e.stopPropagation();
		el.dataset.allowAction = false;
		if(!el.classList.contains('tab')) {mouseDown(e);}
		if(e.which === 3) {
			if(self.selected.length === 0) {self.toggleSelect(elem.dataset.path);}
			else if(self.selected.indexOf(elem.dataset.path) === -1) {self.toggleSelect(self.selected);this.toggleSelect(elem.dataset.path);}
			menu.open(el);
		}
		else if(e.metaKey || e.ctrlKey) {
			self.toggleSelect(elem.dataset.path);
		}
		else if(e.shiftKey && el.parentNode.classList.contains('file')) {
			if(!el.parentNode.parentNode.classList.contains('folder')) {return false;}
			var folder = el.parentNode.parentNode.previousElementSibling.dataset.path;
			var index = this.tree[folder].indexOf(el.parentNode.dataset.path);
			var start = 0, d = Infinity;
			self.selected.forEach(function(path) {
				var elem = self.elem.querySelector('[data-path="'+path+'"]');
				if(elem.parentNode.classList.contains('folder')) {
					if(folder === elem.parentNode.previousElementSibling.dataset.path) {
						var dist = Math.abs(index - self.tree[folder].indexOf(path));
						if(dist <= d) {
							start = self.tree[folder].indexOf(path);
							d = dist;
						}
					}
				}
			});
			if(start > index) {var save = index;index = start;start = save;}
			this.toggleSelect(self.tree[folder].slice(start, index+1),true);
		}
		else if(e.altKey) {
			toggleFavorite(elem.dataset.path);
			if(this.selected.indexOf(elem.dataset.path) > -1 && document.getElementById('favWrap').style.display === 'block') {
				this.toggleSelect(elem.dataset.path);
			}
		}
		else {
			el.dataset.allowAction = true;
			if(elem.classList.contains('dir')) {
				fileHold = elem;
				holdTimer = setTimeout(function() {
					var offset = el.getBoundingClientRect();
					if(!drag && fileHold === elem && mx > offset.x && mx < offset.right && my > offset.y && my < offset.bottom) {
						self.setRoot(elem.dataset.path,true);
					}
				}, 1500);
			}
		}
	}
	mouseUp(e,el) {
		var self = this;
		var elem = el.classList.contains('tab') ? el : el.parentNode;
		if(el.dataset.allowAction === 'true') {
			menu.close();
			if(elem.classList.contains('dir')) {
				self.toggleFolder(elem);
				self.deselect();
			}
			else if(Tree.pickImg(elem.dataset.path) === 'archive') {
				var dirname = elem.dataset.path.split('.')[0];
				self.deselect();
				self.toggleSelect(elem.dataset.path);
				popup('Extract Into', '<input placeholder="/" value="'+dirname+'" oninput="filter(this,\'file\');" onkeydown="if(event.keyCode == 13){File.extract(tree.selected,[this]);}" onfocus="this.setSelectionRange(this.value.length,this.value.length);this.scrollLeft = this.scrollWidth;" spellcheck="false" />', ['Extract'], [File.extract]);
			}
			else {
				if(elem.dataset.path in user.docs && !el.classList.contains('tab')) {
					user.docs[elem.dataset.path].panel.editMode(elem.dataset.path);
				}
				else {
					if(elem.dataset.path in user.docs) {user.docs[elem.dataset.path].panel.open(elem.dataset.path);}
					else {user.panel.open(elem.dataset.path);}
				}
				self.deselect();
			}
		}
	}
	onMove(e,elem) {
		var self = this;
		var marker = document.getElementById('dragMarker');
		var offset = this.elem.getBoundingClientRect();
		if(marker.style.display !== "flex") {
			if(self.selected.length > 0 && self.selected.indexOf(elem.parentNode.dataset.path) === -1) {tree.deselect();return;}
			if(self.selected.length === 0) {self.toggleSelect(elem.parentNode.dataset.path);}
			self.selected.forEach(function(path) {
				var e = self.elem.querySelector('[data-path="'+path+'"]');
				e.style.display = "none";
				var pf = e.nextElementSibling;
				if(pf && pf.classList.contains('folder')) {
					pf.style.display = 'none';
				} 
			});
		}
		marker.style.display = "flex";
		marker.style.left = mx - e.detail.offset.x  + "px";
		marker.style.top = my - e.detail.offset.y + "px";
		marker.children[1].innerHTML = self.selected.length == 1 ? self.selected.length + ' File' : self.selected.length + ' Files';
		e.detail.dest = highlightFolder(mx,my);
		clearInterval(this.treeInterval);
		this.treeInterval = setInterval(function() {
			var bounds = document.getElementById('tree').getBoundingClientRect();
			if(mx > bounds.x && mx < bounds.right && my < bounds.y + 20) {
				document.getElementById('tree').scrollTop -= self.scrollSpd;
				if(self.scrollSpd < 10) {self.scrollSpd += .05;}
			}
			else if(mx > bounds.x && mx < bounds.right && my > bounds.bottom - 20) {
				document.getElementById('tree').scrollTop += self.scrollSpd;
				if(self.scrollSpd < 10) {self.scrollSpd += .05;}
			}
			else {self.scrollSpd = 1;}
		}, 10);
	}
	onRelease(e,elem) {
		var self = this;
		var marker = document.getElementById('dragMarker');
		marker.style.display = "none";
		if(e.detail.dest) {
			File.move(this.selected,e.detail.dest);
			clearFileOver();
		}
		this.selected.forEach(function(path) {
			var e = self.elem.querySelector('[data-path="'+path+'"]');
			e.style.display = "grid";
			var pf = e.nextElementSibling;
			if(pf && pf.classList.contains('folder')) {
				pf.style.display = 'block';
			} 
		});
		this.deselect();
		clearInterval(this.treeInterval);
	}
	deselect() {
		this.toggleSelect(this.selected);
	}
	toggleSelect(paths, set) {
		if(typeof paths !== 'object') {paths = [paths];}
		for(var i = paths.length-1;i>-1;i--) {
			var index = this.selected.indexOf(paths[i]);
			var elems = document.getElementById('sidebar').querySelectorAll('[data-path="'+paths[i]+'"]');
			elems.forEach(function(elem) {
				elem = elem.querySelector('span');
				if(index > -1 && set !== true) {elem.classList.remove('selected');}
				else if(set !== false) {elem.classList.add('selected');}
			});
			if(index > -1 && set !== true) {
				this.selected.splice(index, 1);
			}
			else if(set !== false) {
				if(this.selected.indexOf(paths[i]) > -1) {return;}
				this.selected.push(paths[i]);
			}
		}
	}
	addLoader(path) {
		var elem = this.elem.querySelector('[data-path="'+path+'"]');
		if(elem) {
			var l = document.createElement('div');
			l.className = 'loader inline';
			elem.classList.add('loading');
			elem.appendChild(l);
		}
	}
	removeLoader(path) {
		var elem = this.elem.querySelector('[data-path="'+path+'"]');
		if(elem) {
			var l = elem.querySelector('.loader');
			if(l) {
				l.parentNode.removeChild(l);
				elem.classList.remove('loading');
			}
		}
	}
	find(query) {
		this.clearHighlight();
		if(query === '') {this.results = [];}
		else {this.results = fuzzysort.go(query, this.searchable, {limit: 10,threshold: -20000,allowTypo: true,key: 'name'})};
		this.rIndex = 0;
		this.findNext();
	}
	findNext() {
		this.closeTmp();
		if(this.results.length > 0) {
			this.clearHighlight();
			if(this.rIndex > this.results.length - 1) {this.rIndex = 0;}
			this.highlight(this.results[this.rIndex], true);
			this.rIndex ++;
		}
	}
	closeTmp() {
		var self = this;
		this.elem.querySelectorAll('.tmp').forEach(function(elem) {
			elem.classList.remove('open');
			self.opened.splice(self.opened.indexOf(elem.dataset.path), 1);
			elem.classList.remove('tmp');
		});
	}
	highlight(result, persist) {
		var self = this;
		var path = typeof result === 'object' ? result.obj.path : result;
		this.openTo(path, function() {
			var elem = tree.elem.querySelector('[data-path="'+path+'"]');
			if(elem) {
				clearTimeout(self.highlights[path]);
				elem.classList.add('highlight');
				if(typeof result === 'object') {
					var span = elem.querySelector('span > span');
					span.innerHTML = fuzzysort.highlight(result);
				}
				document.getElementById('tree').scrollTop = elem.offsetTop - document.getElementById('tree').offsetHeight/2 - elem.offsetHeight/2;
				if(!persist) {
					self.highlights[path] = setTimeout(function() {elem.innerHTML.replace(/(<b>|<\/b>)/gim, '');elem.classList.remove('highlight');}, 3000);
				}
			}
		});
	}
	clearHighlight() {
		Object.values(this.highlights).forEach(function(h) {clearTimeout(h);});
		this.elem.querySelectorAll('.highlight').forEach(function(h) {h.innerHTML.replace(/(<b>|<\/b>)/gim, '');h.classList.remove('highlight');});
	}
	static pickImg(path) {
		for(var i = 0;i<rexps.length;i++) {
			if(path.match(rexps[i])) {
					return fileImgs[i];
			}
		}
		return 'default';
	}
}
var rexps = [/[\S]*\.html$/gim,/[\S]*\.css$/gim,/[\S]*\.js$/gim,/[\S]*\.php$/gim,/[\S]*\.xml$/gim,/[\S]*\.htaccess$/gim,/[\S]*\.csv$/gim,/[\S]*\.dat$/gim,/[\S]*\.conf$/gim,/[\S]*\.py$/gim,/[\S]*package[\S]*\.json$/gim,/[\S]*\.json$/gim,/[\S]*\.bat$/gim,/[\S]*\.exe$/gim,/[\S]*\.jar$/gim,/[\S]*\.ttf$/gim,/[\S]*\.oft$/gim,/[\S]*\.fnt$/gim,/[\S]*\.fon$/gim,/[\S]*\.zip$/gim,/[\S]*\.rar$/gim,/[\S]*\.tar$/gim,/[\S]*\.tar.gz$/gim,/[\S]*\.7z$/gim,/[\S]*\.xhtml$/gim,/[\S]*\.png$/gim,/[\S]*\.svg$/gim,/[\S]*\.gif$/gim,/[\S]*\.jpeg$/gim,/[\S]*\.jpg$/gim,/[\S]*\.ico$/gim,/[\S]*\.ai$/gim,/[\S]*\.ae$/gim,/[\S]*\.c$/gim,/[\S]*\.cpp$/gim,/[\S]*\.cs$/gim,/[\S]*\.diff$/gim,/[\S]*\.rb$/gim,/[\S]*\.applescript$/gim,/[\S]*\.cson$/gim,/[\S]*\.coffee$/gim,/[\S]*\.bin$/gim,/[\S]*\.indd$/gim,/[\S]*\.tif$/gim,/[\S]*\.psd$/gim,/[\S]*\.tiff$/gim,/[\S]*\.jfif$/gim,/[\S]*\.xls$/gim,/[\S]*\.git$/gim,/[\S]*\.gitignore$/gim,/[\S]*\.gitattributes$/gim,/[\S]*\.haml$/gim,/[\S]*\.hs$/gim,/[\S]*\.lhs$/gim,/[\S]*\.jsp$/gim,/[\S]*\.less$/gim,/[\S]*\.lic$/gim,/[\S]*\.lisp$/gim,/[\S]*\.lua$/gim,/[\S]*\.m$/gim,/[\S]*\.mb$/gim,/[\S]*\.mustache$/gim,/[\S]*\.one$/gim,/[\S]*\.p.$/gim,/[\S]*\.md$/gim,/[\S]*\.pptx$/gim,/[\S]*\.pref$/gim,/[\S]*\.ppj$/gim,/[\S]*\.rb$/gim,/[\S]*\.sass$/gim,/[\S]*\.scss$/gim,/[\S]*\.sql$/gim,/[\S]*\.swift$/gim,/[\S]*\.vim$/gim,/[\S]*\.vue$/gim,/[\S]*\.docx$/gim,/[\S]*\.yml$/gim,/[\S]*\.webpack$/gim,/[\S]*\.mov$/gim,/[\S]*\.mp4$/gim,/[\S]*\.wmv$/gim,/[\S]*\.avi$/gim,/[\S]*\.webm$/gim,/[\S]*\.txt$/gim,/[\S]*\.rtf$/gim,/[\S]*\.log$/gim,/[\S]*\.mp3$/gim,/[\S]*\.oog$/gim,/[\S]*\.wav$/gim,/[\S]*\.pdf$/gim];
var fileImgs = ['html','css' ,'js','php','markup','tcl','csv','csv','log','python','npm','json','shell','shell','java','font','font','font','font','archive','archive','archive','archive','archive','markup','image','svg','image','image','image','image','ai','ae','c','cpp','csharp','diff','ruby','applescript','coffeescript','coffeescript','binary','indesign','image','psd','image','image','excel','git','git','git','haml','haskell','haskell','jsp','less','licence','lisp','lua','matlab','maya','mustache','onenote','pearl','markdown','powerpoint','prefrences','premire','ruby','sass','scss','sql','swift','vim','vue','word','yaml','webpack','video','video','video','video','video','log','log','log','audio','audio','audio','pdf'];