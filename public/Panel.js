class Panel {
	constructor() {
		this.svg = '<svg onmousedown="event.stopPropagation();" onclick="user.docs[this.parentNode.dataset.path].panel.close(this.parentNode.dataset.path);" viewBox="0 0 371.23 371.23"><polygon points="371.23,21.213 350.018,0 185.615,164.402 21.213,0 0,21.213 164.402,185.615 0,350.018 21.213,371.23   185.615,206.828 350.018,371.23 371.23,350.018 206.828,185.615 "></polygon></svg>';
		this.elem = document.createElement('div');
		this.elem.className = 'panel';
		this.filebarWrap = document.createElement('div');
		this.filebarWrap.className = 'filebarWrap';
		this.filebarWrap.innerHTML = `<div class="filebarArrows"><svg onmouseout="clearInterval(arrowInterval)" onmousedown="var self = this;arrowInterval = setInterval(function() {self.parentNode.nextElementSibling.scrollLeft -= 3;},10);" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 309.143 309.143"><path d="M112.855,154.571L240.481,26.946c2.929-2.929,2.929-7.678,0-10.606L226.339,2.197C224.933,0.79,223.025,0,221.036,0c-1.989,0-3.897,0.79-5.303,2.197L68.661,149.268c-2.929,2.929-2.929,7.678,0,10.606l147.071,147.071c1.406,1.407,3.314,2.197,5.303,2.197c1.989,0,3.897-0.79,5.303-2.197l14.142-14.143c2.929-2.929,2.929-7.678,0-10.606L112.855,154.571z"/></svg><svg onmouseout="clearInterval(arrowInterval)" onmousedown="var self = this;arrowInterval = setInterval(function() {self.parentNode.nextElementSibling.scrollLeft += 3;},10);" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 309.143 309.143"><path d="M112.855,154.571L240.481,26.946c2.929-2.929,2.929-7.678,0-10.606L226.339,2.197C224.933,0.79,223.025,0,221.036,0c-1.989,0-3.897,0.79-5.303,2.197L68.661,149.268c-2.929,2.929-2.929,7.678,0,10.606l147.071,147.071c1.406,1.407,3.314,2.197,5.303,2.197c1.989,0,3.897-0.79,5.303-2.197l14.142-14.143c2.929-2.929,2.929-7.678,0-10.606L112.855,154.571z"/></svg>`;
		this.filebarWrap.addEventListener('mousedown', function(e) {if(e.which === 3) {e.stopPropagation();mouseDown(e);menu.open(this);}})
		this.elem.appendChild(this.filebarWrap);
		this.filebar = document.createElement('div');
		this.filebar.className = 'filebar';
		this.filebarWrap.appendChild(this.filebar);
		this.editorElem = document.createElement('div');
		this.editorElem.className = 'editorWrap';
		this.editorElem.addEventListener('contextmenu', function(e) {e.stopPropagation();});
		this.elem.appendChild(this.editorElem);
		this.editor = new Editor(this);
		this.editor.wrap.style.zIndex = 0;
		this.highlight = document.createElement('div');
		this.highlight.className = 'panelHighlight';
		this.editorElem.appendChild(this.highlight);
		document.getElementById('content').appendChild(this.elem);
		user.panels.push(this);
		user.panel = this;
		user.active = null;
		this.files = [];
		this.editors = [];
		this.editors.push(this.editor);
	}
	open(path) {
		var self = this;
		if(this.active === path && user.panel === this) {return;}
		if(path in user.docs) {
			user.panel = this;
			this.active = path;
			user.docs[path].editor.focus();
			this.updateActive();
		}
		else {
			user.join(path, function() {
				user.panel = self;
				self.add(path);
				self.active = path;
				user.docs[path].editor.focus();
				self.update();
			});
		}
		if(document.body.offsetWidth < 600) {fullScreenToggle(true);}
	}
	close(path, override) {
		var self = this, index = this.files.indexOf(path);
		if(!user.docs[path].isSaved && !override) {popup('Save?', '<div style="padding: 10px 20px">Would you like to save <span style="color:var(--activetext);">' + user.docs[path].basename + '</span> before you go?</div>', ['Don\'t Save', 'Save'], [function() {self.close(path,true);closePopup();},function() {savenclose.push(path);user.docs[path].save();closePopup();}]);return;}
		user.leave(path, function() {
			self.remove(path);
			if(path === self.active) {
				findOther(self.files,index,function(n) {
					if(n === null) {self.active = null;}
					else {self.open(n);}
					self.update();
				});
			}
			else {self.update();}
			user.checkAllSaved();
		}, override);
	}
	editMode(path) {
		var index = this.files.indexOf(path);
		var self = this;
		if(index > -1) {
			user.leave(path, function() {
				self.remove(path);
				user.join(path, function() {
					self.add(path,index);
					self.active = path;
					self.update();
				}, true);
			});
		}
		else {this.open(path);}
	}
	add(path, index) {
		if(isNaN(index)) {index = this.files.length;}
		if(this.files.indexOf(path) === -1) {
			this.files.splice(index, 0, path);
		}
	}
	remove(path) {
		this.files.splice(this.files.indexOf(path), 1);
	}
	update() {
		var self = this;
		this.filebar.innerHTML = "";
		var names = [];
		this.files.forEach(function(path) {
			var elem = document.createElement('div');
			var name = user.docs[path].basename;
			if(names.indexOf(name) > -1 && !user.docs[path].isUndefined) {
				var psplit = path.split('/');
				var len = psplit.length, i = 1;
				while(names.indexOf(name) > -1 &&i < len) {
					var other = user.docs[self.files[names.indexOf(name)]].path.split('/');
					var othername = other.slice(other.length-i,other.length).join('/');
					self.filebar.children[names.indexOf(name)].innerHTML = othername + self.svg;
					names[names.indexOf(name)] = othername;
					name = psplit.slice(len - i,len).join('/');
					i++;
				}
			}
			if(user.docs[path].isUndefined) {elem.dataset.isUndefined = 'true';}
			elem.dataset.path = path;
			elem.className = 'tab';
			if(path === self.active) {elem.classList.add('active');}
			if(!user.docs[path].isSaved) {elem.classList.add('unsaved');}
			elem.innerHTML = name+self.svg;
			self.filebar.appendChild(elem);
			elem.onmousedown = function(e) {if(e.which === 3 || e.altKey || (e.ctrlKey || e.metaKey)) {tree.mouseDown(e,this);}else {this.dataset.allowAction = true;}}
			elem.onmouseup = function(e) {if(!drag){mouseUp(e);tree.mouseUp(e,this);}}
			elem.addEventListener('move', function(e) {self.onMove(e,this);});
			elem.addEventListener('release', function(e) {self.onRelease(e,this)});
			user.docs[path].editor.wrap.style.zIndex = path === self.active ? 0 : -1;
			names.push(name);
		});
		if(!this.active) {this.editor.wrap.style.zIndex = 0;}
		if(user && this.files.length === 0 && user.panels.length > 1) {this.delete();}
	}
	updateActive() {
		this.filebar.querySelector('.active').classList.remove('active');
		this.filebar.querySelector('[data-path="'+this.active+'"]').classList.add('active');
		this.elem.querySelectorAll('.wrap').forEach(function(wrap) {wrap.style.zIndex = -1;});
		user.docs[this.active].editor.wrap.style.zIndex = 0;
	}
	onMove(e,elem) {
		var rel = this.elem.getBoundingClientRect();
		var x = mx - e.detail.offset.x - rel.x, y = my - e.detail.offset.y - rel.y, pnlFound = false;
		elem.style.position = "absolute";
		elem.style.background = "var(--highlight)";
		elem.style.zIndex = 1;
		document.querySelectorAll('.filebar, .tab').forEach(function(filebar) {filebar.style.border = 'none';});
		user.panels.forEach(function(panel) {
			var offset = panel.elem.getBoundingClientRect();
			if(mx >= offset.x && mx < offset.right && my > offset.top-17.5 && my < offset.y + 52.5) {
				y = offset.y - rel.y;
				var files = panel.filebar.children, closest = {d: Infinity}, remaining = [];
				for(var j = 0;j<files.length;j++) {
					if(files[j] === elem) {continue;}
					var d = Math.abs(x-files[j].offsetLeft);
					if(d < closest.d) {
						closest = {d,file:files[j],index:remaining.length}
					}
					remaining.push(files[j]);
				}
				if(closest.file) {
					if(closest.file === remaining[remaining.length-1] && x > closest.file.offsetLeft + closest.file.offsetWidth/2) {
						closest.file.style.borderRight = "2px solid var(--accent)";
						e.detail.index = remaining.length;
					}
					else {
						closest.file.style.borderLeft = "2px solid var(--accent)";
						e.detail.index = closest.index;
					}
				}
				else {
					e.detail.index = 0;
					panel.filebar.style.borderLeft = "2px solid var(--accent)";
				}
				e.detail.destination = panel;
				panel.highlight.className = 'panelHighlight';
			}
			else if(my > offset.top && my < offset.bottom && mx > offset.x && mx < offset.x+offset.width/3) {
				panel.highlight.className = 'panelHighlight top vert';
				e.detail.panel = panel;
				pnlFound = true;
			}
			else if(my > offset.top && my < offset.bottom && mx < offset.right && mx > offset.right - offset.width/3) {
				panel.highlight.className = 'panelHighlight bottom vert';
				e.detail.panel = panel;
				pnlFound = true;
			}
			else if(mx > offset.x && mx < offset.right && my > offset.top && my < offset.top + offset.height/3) {
				panel.highlight.className = 'panelHighlight top hor';
				e.detail.panel = panel;
				pnlFound = true;
			}
			else if(mx > offset.x && mx < offset.right && my < offset.bottom && my > offset.bottom - offset.height/3) {
				panel.highlight.className = 'panelHighlight bottom hor';
				e.detail.panel = panel;
				pnlFound = true;
			}
			else {
				panel.highlight.className = 'panelHighlight';
			}
		});
		elem.style.top = y + "px";
		elem.style.left = x + "px";
		if(!pnlFound) {e.detail.panel = false;}
	}
	onRelease(e,elem) {
		var self = this;
		var index = this.files.indexOf(elem.dataset.path);
		document.querySelectorAll('.filebar').forEach(function(filebar) {filebar.style.border = 'none';});
		if(e.detail.destination) {
			this.remove(elem.dataset.path);
			e.detail.destination.add(elem.dataset.path, e.detail.index);
			if(this !== e.detail.destination) {
				this.editorElem.removeChild(user.docs[elem.dataset.path].editor.wrap);
				this.editors.splice(this.editors.indexOf(user.docs[elem.dataset.path].editor),1);
				e.detail.destination.editorElem.appendChild(user.docs[elem.dataset.path].editor.wrap);
				e.detail.destination.editors.push(user.docs[elem.dataset.path].editor);
				user.docs[elem.dataset.path].panel = e.detail.destination;
				if(this.active === elem.dataset.path) {
					findOther(this.files,index, function(n) {self.active = n;});
				}
				e.detail.destination.active = elem.dataset.path;
				this.update();
			}
			e.detail.destination.update();	
		}
		else if(e.detail.panel) {
			var cls = e.detail.panel.highlight.className.split(' ');
			var pnl = new Panel();
			var wrap = document.createElement('div');
			wrap.className = 'panelWrap ' + cls.slice(1,3).join(' ');
			e.detail.panel.elem.parentNode.insertBefore(wrap,e.detail.panel.elem);
			if(cls.indexOf('top') > -1) {wrap.appendChild(pnl.elem);wrap.appendChild(e.detail.panel.elem);new Resizer(pnl.elem, cls[2]);}
			else {wrap.appendChild(e.detail.panel.elem);wrap.appendChild(pnl.elem);new Resizer(e.detail.panel.elem, cls[2]);}			
			this.remove(elem.dataset.path);
			pnl.add(elem.dataset.path);
			this.editorElem.removeChild(user.docs[elem.dataset.path].editor.wrap);
			this.editors.splice(this.editors.indexOf(user.docs[elem.dataset.path].editor),1);
			pnl.editorElem.appendChild(user.docs[elem.dataset.path].editor.wrap);
			pnl.editors.push(user.docs[elem.dataset.path].editor);
			user.docs[elem.dataset.path].panel = pnl;
			if(this.active === elem.dataset.path) {
				findOther(this.files,index, function(n) {self.active = n;});
			}
			pnl.active = elem.dataset.path;
			this.update();
			pnl.update();
		}
		else {
			this.update();
		}
		document.querySelectorAll('.panelHighlight').forEach(function(h) {h.className = 'panelHighlight';});
	}
	resize() {
		this.editors.forEach(function(editor) {
			editor.resize();
		});
	}
	delete() {
		var self = this;
		this.files.forEach(function(path) {
			self.close(path);
		});
		this.editor.wrap.remove();
		this.editor.destroy();
		if(this.elem.parentNode.classList.contains('panelWrap') && this.elem.parentNode.children.length < 3) {
			var wrap = this.elem.parentNode;
			for(var i = wrap.children.length-1;i>=0;i--) {
				wrap.children[i].querySelectorAll('.resizer').forEach(function(elem) {elem.remove();});
				wrap.parentNode.appendChild(wrap.children[i]);
			}
			wrap.remove();
			this.elem.remove();
			user.panels.forEach(function(panel) {panel.resize();});
		}
		else {this.elem.remove();}
		var index = user.panels.indexOf(this);
		user.panels.splice(index, 1);
		findOther(user.panels,index, function(n) {if(n === null) {n = new Panel();}user.panel = n;})
	}
	static selectAll(elem) {
		var files = elem.querySelectorAll('.tab');
		tree.deselect();
		files.forEach(function(file) {
			tree.toggleSelect(file.dataset.path);
		});
		menu.close();
	}
	static closeAll(elem) {
		var files = elem.querySelectorAll('.tab');
		files.forEach(function(file) {
			var path = file.dataset.path;
			user.docs[path].panel.close(path);
		});
		menu.close();
	}
}